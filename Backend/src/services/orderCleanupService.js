const { getDatabase } = require('../config/db');

/**
 * Tự động kiểm tra và xử lý đơn hàng chưa mua:
 * 1. Đơn TikTok: Nếu sau 1 ngày (24h) không có API báo về (vẫn ở trạng thái pending)
 *    -> chuyển trạng thái sang 'unpurchased' (Chưa mua hàng).
 * 2. Đơn TikTok & Shopee: Sau 7 ngày mà chưa mua (ở trạng thái 'unpurchased' hoặc pending quá 7 ngày)
 *    -> XÓA KHỎI DANH SÁCH ĐƠN HÀNG (kể cả tiktok và shopee).
 */
async function autoCleanAndCheckUnpurchasedOrders(dbInstance) {
  try {
    const db = dbInstance || await getDatabase();
    const now = new Date();

    // Mốc 1 ngày trước (24 giờ)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').slice(0, 19);

    // Mốc 7 ngày trước (7 * 24 giờ)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString().replace('T', ' ').slice(0, 19);

    // 1. Chuyển đơn TikTok pending sau 1 ngày (>= 24h) không có API báo về sang 'unpurchased'
    await db.run(
      `UPDATE tiktok_orders 
       SET status = 'unpurchased',
           notes = 'Chưa mua hàng (Không có dữ liệu đơn hàng từ TikTok sau 24h)',
           updated_at = CURRENT_TIMESTAMP
       WHERE status = 'pending' AND created_at <= ?`,
      [oneDayAgo]
    );

    // 2. Xóa các đơn chưa mua sau 7 ngày khỏi danh sách đơn hàng (kể cả TikTok và Shopee)
    // - Xóa đơn TikTok ở trạng thái 'unpurchased' hoặc pending quá 7 ngày
    await db.run(
      `DELETE FROM tiktok_orders 
       WHERE (status = 'unpurchased' OR status = 'pending') AND created_at <= ?`,
      [sevenDaysAgo]
    );

    // - Xóa đơn Shopee ở trạng thái 'unpurchased' hoặc pending tạm (CLK...) quá 7 ngày
    await db.run(
      `DELETE FROM orders 
       WHERE (status = 'unpurchased' OR (status = 'pending' AND id LIKE 'CLK%')) AND created_at <= ?`,
      [sevenDaysAgo]
    );
  } catch (err) {
    console.warn('Lỗi khi tự động dọn dẹp đơn hàng chưa mua:', err.message);
  }
}

module.exports = {
  autoCleanAndCheckUnpurchasedOrders
};

