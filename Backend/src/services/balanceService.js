/**
 * balanceService.js
 * Dịch vụ tính toán và đồng bộ số dư người dùng chuẩn xác tuyệt đối:
 * - Quà đăng ký thành viên mới (signup_bonus): +30.000đ
 * - Thưởng giới thiệu bạn bè: +5.000đ / 1 người (Chờ duyệt khi đăng ký, Đã duyệt cộng vào ví khi cấp dưới hoàn thành đơn hàng đầu tiên)
 * - Số Dư Khả Dụng = (Quà tân thủ + Tổng hoàn tiền đơn hoàn thành [approved/paid] + Thưởng giới thiệu đã duyệt) - (Tổng tiền rút [approved/pending])
 */

const { getDatabase } = require('../config/db');

const SIGNUP_BONUS_AMOUNT = 30000;
const REFERRAL_BONUS_PER_USER = 5000;

async function recalculateUserBalances(dbInstance = null, targetUserIds = null) {
  const db = dbInstance || (await getDatabase());

  let userQuery = 'SELECT id, role, signup_bonus, referral_earnings FROM users';
  let queryParams = [];

  if (targetUserIds && Array.isArray(targetUserIds) && targetUserIds.length > 0) {
    let validIds = Array.from(new Set(targetUserIds.filter(Boolean)));
    if (validIds.length === 0) return { updatedCount: 0 };

    // Tự động tìm thêm tất cả người giới thiệu (referrer) của các user này
    // để cập nhật lại hoa hồng và số dư cho người giới thiệu khi đơn của F1 hoàn thành/thay đổi trạng thái!
    try {
      const placeholders = validIds.map(() => '?').join(',');
      const referrerRows = await db.all(
        `SELECT DISTINCT referred_by FROM users WHERE id IN (${placeholders}) AND referred_by IS NOT NULL AND referred_by != ''`,
        validIds
      );
      for (const r of referrerRows) {
        if (r.referred_by && !validIds.includes(r.referred_by)) {
          validIds.push(r.referred_by);
        }
      }
    } catch (e) {
      console.warn('Error expanding referrers in recalculateUserBalances:', e.message);
    }

    userQuery += ` WHERE id IN (${validIds.map(() => '?').join(',')})`;
    queryParams = validIds;
  }

  const users = await db.all(userQuery, queryParams);

  for (const u of users) {
    // 0. Quà đăng ký thành viên mới (+30.000đ cho user)
    const signupBonus = u.role === 'admin'
      ? 0
      : Math.floor(Number(u.signup_bonus !== null && u.signup_bonus !== undefined ? u.signup_bonus : SIGNUP_BONUS_AMOUNT));

    // 1. Tổng tiền hoàn từ các đơn hàng HOÀN THÀNH (approved hoặc paid) từ cả Shopee và TikTok
    const orderRow = await db.get(
      `SELECT SUM(CASE WHEN real_cashback IS NOT NULL AND real_cashback > 0 THEN real_cashback ELSE estimated_cashback END) as totalCashback
       FROM orders
       WHERE user_id = ? AND status IN ('approved', 'paid')`,
      [u.id]
    );
    const completedShopee = Math.floor(orderRow ? (orderRow.totalCashback || 0) : 0);

    const ttOrderRow = await db.get(
      `SELECT SUM(CASE WHEN real_cashback IS NOT NULL AND real_cashback > 0 THEN real_cashback ELSE estimated_cashback END) as totalCashback
       FROM tiktok_orders
       WHERE user_id = ? AND status IN ('approved', 'paid')`,
      [u.id]
    );
    const completedTikTok = Math.floor(ttOrderRow ? (ttOrderRow.totalCashback || 0) : 0);
    const completedCashback = completedShopee + completedTikTok;

    // 2. Tính tiền thưởng giới thiệu bạn bè:
    //    (a) +5.000đ cho mỗi cấp dưới F1 đã hoàn thành ít nhất 1 đơn hàng
    //    (b) +20% hoa hồng trên mỗi đơn hàng hoàn thành của F1 (Shopee & TikTok)
    const qualifiedF1Row = await db.get(
      `SELECT COUNT(*) as qualifiedCount
       FROM users f1
       WHERE f1.referred_by = ?
         AND (
           EXISTS (SELECT 1 FROM orders o WHERE o.user_id = f1.id AND o.status IN ('approved', 'paid'))
           OR EXISTS (SELECT 1 FROM tiktok_orders t WHERE t.user_id = f1.id AND t.status IN ('approved', 'paid'))
         )`,
      [u.id]
    );
    const qualifiedF1Count = Number(qualifiedF1Row ? (qualifiedF1Row.qualifiedCount || 0) : 0);
    const inviteBonusApproved = qualifiedF1Count * REFERRAL_BONUS_PER_USER;

    const refOrderRow = await db.get(
      `SELECT SUM(FLOOR((CASE WHEN real_cashback IS NOT NULL AND real_cashback > 0 THEN real_cashback ELSE COALESCE(estimated_cashback, 0) END) * 0.20)) as f1Commission
       FROM orders
       WHERE user_id IN (SELECT id FROM users WHERE referred_by = ?) AND status IN ('approved', 'paid')`,
      [u.id]
    );
    const refTikTokRow = await db.get(
      `SELECT SUM(FLOOR((CASE WHEN real_cashback IS NOT NULL AND real_cashback > 0 THEN real_cashback ELSE COALESCE(estimated_cashback, 0) END) * 0.20)) as f1Commission
       FROM tiktok_orders
       WHERE user_id IN (SELECT id FROM users WHERE referred_by = ?) AND status IN ('approved', 'paid')`,
      [u.id]
    );
    const orderCommissionApproved = Math.floor((refOrderRow?.f1Commission || 0) + (refTikTokRow?.f1Commission || 0));

    const refEarnings = inviteBonusApproved + orderCommissionApproved;

    // 3. Tổng tiền rút (approved và pending)
    const withRow = await db.get(
      `SELECT SUM(amount) as totalWithdrawn
       FROM withdrawals
       WHERE user_id = ? AND status IN ('approved', 'pending')`,
      [u.id]
    );
    const totalDeductions = Math.floor(withRow ? (withRow.totalWithdrawn || 0) : 0);

    // 4. Số dư khả dụng = max(0, (signupBonus + completedCashback + refEarnings) - totalDeductions)
    const calculatedBalance = Math.max(0, (signupBonus + completedCashback + refEarnings) - totalDeductions);

    await db.run(
      `UPDATE users
       SET balance = ?,
           signup_bonus = ?,
           total_cashback = ?,
           referral_earnings = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [calculatedBalance, signupBonus, completedCashback, refEarnings, u.id]
    );
  }

  return { updatedCount: users.length };
}

module.exports = {
  recalculateUserBalances,
  SIGNUP_BONUS_AMOUNT,
  REFERRAL_BONUS_PER_USER
};
