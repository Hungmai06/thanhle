const { getDatabase } = require('../config/db');
const {
  recalculateUserBalances,
  SIGNUP_BONUS_AMOUNT,
  REFERRAL_BONUS_PER_USER
} = require('../services/balanceService');

const MIN_WITHDRAW_AMOUNT = 50000;

/**
 * 1. Thống kê hoa hồng giới thiệu
 * Cơ chế:
 * - Người mới đăng ký nhận 30.000đ
 * - Giới thiệu 1 người: +5.000đ vào Chờ duyệt ngay khi bạn bè đăng ký.
 * - Khi cấp dưới (F1) hoàn thành đơn hàng đầu tiên (approved/paid): +5.000đ chuyển sang Đã duyệt & cộng vào Ví khả dụng.
 * - Min rút: 50.000đ
 * GET /api/referrals/stats
 */
exports.getReferralStats = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDatabase();

    // Đồng bộ chuẩn số dư và tiền thưởng giới thiệu ngay lập tức
    await recalculateUserBalances(db, [userId]);

    // Lấy thông tin user hiện tại
    const user = await db.get(
      `SELECT id, balance, signup_bonus, referral_earnings, COALESCE(referral_clicks, 0) as referral_clicks FROM users WHERE id = ?`,
      [userId]
    );
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Lấy danh sách F1 ids
    const f1Users = await db.all(`SELECT id FROM users WHERE referred_by = ?`, [userId]);
    const f1Count = f1Users.length;
    const f1Ids = f1Users.map(u => u.id);

    let pendingOrdersCount = 0;
    let completedOrdersCount = 0;
    let totalOrdersCount = 0;
    let pendingOrderCommission = 0;
    let approvedOrderCommission = 0;
    const qualifiedF1Set = new Set();

    if (f1Ids.length > 0) {
      const placeholders = f1Ids.map(() => '?').join(',');
      const [shopeeOrders, tiktokOrders] = await Promise.all([
        db.all(`
          SELECT user_id, status, estimated_cashback, real_cashback 
          FROM orders 
          WHERE user_id IN (${placeholders})
        `, f1Ids),
        db.all(`
          SELECT user_id, status, estimated_cashback, real_cashback 
          FROM tiktok_orders 
          WHERE user_id IN (${placeholders})
        `, f1Ids)
      ]);

      const allOrders = [...shopeeOrders, ...tiktokOrders];
      totalOrdersCount = allOrders.length;

      allOrders.forEach(order => {
        const baseCashback = Math.floor(order.real_cashback || order.estimated_cashback || 0);
        const bonus20 = Math.floor(baseCashback * 0.2);

        if (order.status === 'approved' || order.status === 'paid') {
          completedOrdersCount++;
          approvedOrderCommission += bonus20;
          qualifiedF1Set.add(order.user_id);
        } else if (order.status === 'pending' || order.status === 'processing') {
          pendingOrdersCount++;
          pendingOrderCommission += bonus20;
        }
      });
    }

    const qualifiedF1Count = qualifiedF1Set.size;
    const pendingF1Count = Math.max(0, f1Count - qualifiedF1Count);

    // 1. Thưởng mời bạn: +5.000đ/người (Chờ duyệt -> Duyệt khi xong đơn đầu)
    // 2. Hoa hồng đơn hàng: +20% mỗi đơn của F1
    const pendingInviteBonus = pendingF1Count * REFERRAL_BONUS_PER_USER;
    const approvedInviteBonus = qualifiedF1Count * REFERRAL_BONUS_PER_USER;

    const pendingCommission = pendingInviteBonus + pendingOrderCommission;
    const approvedCommission = approvedInviteBonus + approvedOrderCommission;

    res.json({
      clicks: user.referral_clicks || 0,
      f1Count,
      f2Count: 0,
      qualifiedF1Count,
      pendingF1Count,
      rewardPerReferral: REFERRAL_BONUS_PER_USER,
      signupBonus: SIGNUP_BONUS_AMOUNT,
      minWithdraw: MIN_WITHDRAW_AMOUNT,
      pendingInviteBonus,
      approvedInviteBonus,
      pendingOrderCommission,
      approvedOrderCommission,
      pendingCommission: Math.floor(pendingCommission),
      approvedCommission: Math.floor(approvedCommission),
      totalCommission: Math.floor(pendingCommission + approvedCommission),
      pendingOrdersCount,
      completedOrdersCount,
      totalOrdersCount
    });
  } catch (error) {
    console.error('Lỗi khi lấy thống kê giới thiệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * 2. Lịch sử tiền thưởng giới thiệu (+5.000đ / F1)
 * Hiển thị cả F1 vừa đăng ký (+5.000đ Chờ duyệt) và F1 đã hoàn thành đơn đầu (+5.000đ Đã duyệt)
 * GET /api/referrals/history
 */
exports.getReferralHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDatabase();

    // Lấy danh sách F1
    const f1Users = await db.all(
      `SELECT id, name, email, created_at FROM users WHERE referred_by = ? ORDER BY created_at DESC`,
      [userId]
    );
    if (f1Users.length === 0) {
      return res.json([]);
    }

    const f1Ids = f1Users.map(u => u.id);
    const placeholders = f1Ids.map(() => '?').join(',');

    // Lấy tất cả đơn hàng của F1 từ cả Shopee và TikTok
    const [shopeeOrders, tiktokOrders] = await Promise.all([
      db.all(`
        SELECT id, user_id, product_name, product_image, order_amount, status, estimated_cashback, real_cashback, created_at, 'shopee' as platform
        FROM orders 
        WHERE user_id IN (${placeholders})
        ORDER BY created_at ASC
      `, f1Ids),
      db.all(`
        SELECT id, user_id, product_name, product_image, order_amount, status, estimated_cashback, real_cashback, created_at, 'tiktok' as platform
        FROM tiktok_orders 
        WHERE user_id IN (${placeholders})
        ORDER BY created_at ASC
      `, f1Ids)
    ]);

    const allOrders = [...shopeeOrders, ...tiktokOrders].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const f1Map = {};
    f1Users.forEach(u => {
      f1Map[u.id] = u;
    });

    // 1. Khoản thưởng mời bạn (+5.000đ / người)
    const inviteHistory = f1Users.map(f1 => {
      const memberOrders = allOrders.filter(o => o.user_id === f1.id);
      const firstCompletedOrder = memberOrders.find(o => o.status === 'approved' || o.status === 'paid');

      if (firstCompletedOrder) {
        return {
          id: `REF-BONUS-${f1.id}`,
          orderId: firstCompletedOrder.id,
          f1Id: f1.id,
          f1Name: f1.name || 'Thành viên F1',
          f1Email: f1.email || '',
          productName: 'Thưởng mời bạn (+5.000đ) — Đã xong đơn đầu',
          productImage: firstCompletedOrder.product_image || '',
          platform: 'referral',
          orderAmount: Math.floor(firstCompletedOrder.order_amount || 0),
          tier: 'Thưởng +5K',
          baseCashback: 0,
          bonus: REFERRAL_BONUS_PER_USER,
          status: 'approved',
          isCompleted: true,
          statusLabel: 'Đã nhận (+5.000đ)',
          createdAt: firstCompletedOrder.created_at || f1.created_at
        };
      }

      return {
        id: `REF-BONUS-${f1.id}`,
        orderId: `INVITE-${f1.id}`,
        f1Id: f1.id,
        f1Name: f1.name || 'Thành viên F1',
        f1Email: f1.email || '',
        productName: 'Thưởng mời bạn (+5.000đ) — Chờ xong đơn đầu',
        productImage: '',
        platform: 'referral',
        orderAmount: 0,
        tier: 'Thưởng +5K',
        baseCashback: 0,
        bonus: REFERRAL_BONUS_PER_USER,
        status: 'pending',
        isCompleted: false,
        statusLabel: 'Chờ duyệt (+5.000đ)',
        createdAt: f1.created_at
      };
    });

    // 2. Khoản hoa hồng +20% trên từng đơn hàng của F1
    const orderHistory = allOrders.map(order => {
      const f1 = f1Map[order.user_id] || {};
      const baseCashback = Math.floor(order.real_cashback || order.estimated_cashback || 0);
      const bonus = Math.floor(baseCashback * 0.2);
      const isCompleted = order.status === 'approved' || order.status === 'paid';
      const isRejected = order.status === 'rejected' || order.status === 'cancelled';

      return {
        id: order.id,
        orderId: order.id,
        f1Id: order.user_id,
        f1Name: f1.name || 'Thành viên F1',
        f1Email: f1.email || '',
        productName: order.product_name || 'Đơn hàng mua sắm',
        productImage: order.product_image || '',
        platform: order.platform || 'shopee',
        orderAmount: Math.floor(order.order_amount || 0),
        tier: 'Hoa hồng 20%',
        baseCashback,
        bonus,
        status: order.status,
        isCompleted,
        statusLabel: isCompleted ? 'Đã nhận (20%)' : (isRejected ? 'Đã hủy' : 'Chờ duyệt (20%)'),
        createdAt: order.created_at
      };
    });

    const history = [...inviteHistory, ...orderHistory];

    // Sắp xếp mới nhất lên đầu
    history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    res.json(history);
  } catch (error) {
    console.error('Lỗi khi lấy lịch sử giới thiệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * 3. Danh sách mạng lưới thành viên F1
 * GET /api/referrals/members
 */
exports.getReferralMembers = async (req, res) => {
  try {
    const userId = req.user.id;
    const db = await getDatabase();

    const f1Users = await db.all(`
      SELECT id, name, email, phone, avatar, created_at
      FROM users
      WHERE referred_by = ?
      ORDER BY created_at DESC
    `, [userId]);

    if (f1Users.length === 0) {
      return res.json([]);
    }

    const f1Ids = f1Users.map(u => u.id);
    const placeholders = f1Ids.map(() => '?').join(',');

    const [shopeeOrders, tiktokOrders] = await Promise.all([
      db.all(`
        SELECT user_id, order_amount, estimated_cashback, real_cashback, status
        FROM orders
        WHERE user_id IN (${placeholders})
      `, f1Ids),
      db.all(`
        SELECT user_id, order_amount, estimated_cashback, real_cashback, status
        FROM tiktok_orders
        WHERE user_id IN (${placeholders})
      `, f1Ids)
    ]);

    const allOrders = [...shopeeOrders, ...tiktokOrders];

    const members = f1Users.map(member => {
      const memberOrders = allOrders.filter(o => o.user_id === member.id);
      let totalSpent = 0;
      let orderBonusEarned = 0;
      let orderBonusPending = 0;
      let completedOrdersCount = 0;
      let pendingOrdersCount = 0;

      memberOrders.forEach(o => {
        totalSpent += Math.floor(o.order_amount || 0);
        const baseCashback = Math.floor(o.real_cashback || o.estimated_cashback || 0);
        const bonus20 = Math.floor(baseCashback * 0.2);

        if (o.status === 'approved' || o.status === 'paid') {
          completedOrdersCount++;
          orderBonusEarned += bonus20;
        } else if (o.status === 'pending' || o.status === 'processing') {
          pendingOrdersCount++;
          orderBonusPending += bonus20;
        }
      });

      const hasCompletedFirstOrder = completedOrdersCount >= 1;
      const totalBonusEarned = (hasCompletedFirstOrder ? REFERRAL_BONUS_PER_USER : 0) + orderBonusEarned;
      const pendingBonus = (hasCompletedFirstOrder ? 0 : REFERRAL_BONUS_PER_USER) + orderBonusPending;

      return {
        id: member.id,
        name: member.name,
        email: member.email,
        phone: member.phone || '',
        avatar: member.avatar || '',
        createdAt: member.created_at,
        ordersCount: memberOrders.length,
        completedOrdersCount,
        pendingOrdersCount,
        hasCompletedFirstOrder,
        totalSpent,
        totalBonusEarned,
        pendingBonus,
        status: 'active'
      };
    });

    res.json(members);
  } catch (error) {
    console.error('Lỗi khi lấy danh sách thành viên giới thiệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};

/**
 * 4. Ghi nhận lượt click link giới thiệu
 * POST /api/referrals/click (Public)
 */
exports.recordReferralClick = async (req, res) => {
  try {
    const { refId } = req.body;
    if (!refId) {
      return res.status(400).json({ message: 'Thiếu refId' });
    }

    const db = await getDatabase();
    await db.run(
      `UPDATE users SET referral_clicks = COALESCE(referral_clicks, 0) + 1 WHERE id = ?`,
      [refId]
    );

    res.json({ success: true, message: 'Đã ghi nhận lượt click giới thiệu' });
  } catch (error) {
    console.error('Lỗi khi ghi nhận click giới thiệu:', error);
    res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
  }
};
