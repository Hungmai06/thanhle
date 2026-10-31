const {
  validateShopeeUrl,
  validateAffiliateId,
  generateClickId,
  createShopeeAffiliateLink,
  resolveShopeeShortLink,
  normalizeShopeeProductUrl,
  fetchProductDataFromAddLiveTag,
  formatStandardSubId,
  buildShopeeAnRedirLink,
  extractShopeeIds
} = require('../services/shopeeService');
const { getDatabase } = require('../config/db');

/**
 * Trích xuất đầu vào Sub ID từ request body hoặc query (hỗ trợ cả chuỗi, mảng hoặc 5 tham số sub1..sub5)
 */
function extractSubInputFromRequest(source, fallbackId) {
  if (!source) return fallbackId;

  // Nếu có truyền mảng subParams hoặc subIds
  if (Array.isArray(source.subParams)) return source.subParams;
  if (Array.isArray(source.subIds)) return source.subIds;

  // Nếu có truyền object subParams
  if (source.subParams && typeof source.subParams === 'object') {
    return source.subParams;
  }

  // Nếu có truyền các vị trí riêng lẻ sub2, sub3, sub4, sub5
  const hasMultiSubKeys =
    source.sub2 !== undefined || source.sub_id2 !== undefined ||
    source.sub3 !== undefined || source.sub_id3 !== undefined ||
    source.sub4 !== undefined || source.sub_id4 !== undefined ||
    source.sub5 !== undefined || source.sub_id5 !== undefined;

  if (hasMultiSubKeys) {
    return {
      sub1: source.sub1 ?? source.sub_id1 ?? source.user_id ?? source.userId ?? fallbackId ?? '',
      sub2: source.sub2 ?? source.sub_id2 ?? '',
      sub3: source.sub3 ?? source.sub_id3 ?? '',
      sub4: source.sub4 ?? source.sub_id4 ?? '',
      sub5: source.sub5 ?? source.sub_id5 ?? ''
    };
  }

  const singleRaw =
    source.sub_id ??
    source.subId ??
    source.subParams ??
    source.sub1 ??
    source.sub_id1 ??
    fallbackId ??
    '';

  return singleRaw;
}

async function convertShopeeLink(req, res) {
  try {
    const rawOriginUrl = req.body.url || req.body.originUrl;
    const country = (req.body.country || 'VN').toUpperCase();

    if (!rawOriginUrl) {
      return res.status(400).json({
        success: false,
        error: 'Thiếu URL Shopee',
        message: 'Thiếu URL Shopee'
      });
    }

    // 1. Kiểm tra sơ bộ URL Shopee (cho phép short link ở bước đầu để giải mã)
    validateShopeeUrl(rawOriginUrl, { country, allowShortLink: true });

    // Giải mã short link (nếu có) và chuẩn hóa thành Landing Page sạch đúng 2 định dạng chuẩn
    const originUrl = await resolveShopeeShortLink(rawOriginUrl, country);

    // 2. Lấy mã tracking clickId và chuẩn hóa Sub ID (tối đa 5 vị trí sub1-sub2-sub3-sub4-sub5)
    const clickId = generateClickId();
    const resolvedUserId = req.user ? req.user.id : (req.body.user_id || req.body.userId || null);
    const rawSubInput = extractSubInputFromRequest(req.body, resolvedUserId || clickId);
    const subId = formatStandardSubId(rawSubInput);

    // 3. Lấy cấu hình Affiliate ID từ request, CSDL hoặc biến môi trường
    let customBaseUrl = '';
    let dbAffId = '';
    const db = await getDatabase();
    try {
      const settings = await db.get('SELECT shopee_affiliate_id, shopee_cookie_url FROM system_settings WHERE id = 1');
      if (settings) {
        customBaseUrl = settings.shopee_cookie_url || '';
        dbAffId = settings.shopee_affiliate_id || '';
      }
    } catch (sErr) {}

    const targetAffId = req.body.affiliate_id || req.body.affiliateId || dbAffId || process.env.SHOPEE_AFFILIATE_ID || '';
    const validAffId = validateAffiliateId(targetAffId);

    // 4. Tạo trực tiếp 1 link mua hàng an_redir duy nhất cho sản phẩm của khách (1 bước)
    const linkResult = buildShopeeAnRedirLink({
      originUrl,
      affiliateId: validAffId,
      subParams: subId,
      country
    });
    const affiliateLink = linkResult.finalUrl;

    // 5. Lưu thông tin click & mapping (sub_id -> user_id) vào DB
    const { shopId, itemId } = extractShopeeIds(originUrl);
    try {
      await db.run(
        'INSERT INTO click_logs (id, user_id, product_url, sub_id, shop_id, item_id) VALUES (?, ?, ?, ?, ?, ?)',
        [clickId, resolvedUserId, originUrl, subId, shopId || null, itemId || null]
      );
    } catch (dbErr) {
      console.warn('Click log insertion warning:', dbErr.message);
    }

    // 6. Trả về kết quả đầy đủ (giữ link1 & link2 trỏ về cùng affiliateLink để tương thích ngược)
    return res.json({
      success: true,
      affiliateLink,
      link1: affiliateLink,
      link2: affiliateLink,
      originUrl: linkResult.cleanLanding,
      encodedLanding: linkResult.encodedLanding,
      affiliateId: linkResult.affiliateId,
      clickId,
      subId,
      shopId,
      itemId
    });

  } catch (error) {
    return res.status(400).json({
      success: false,
      error: error.message || 'URL không hợp lệ',
      message: error.message || 'URL không hợp lệ'
    });
  }
}

/**
 * Xử lý chuyển hướng trực tiếp (GET Redirect Gateway)
 * Nhận URL thô qua query parameter ?url=..., tự tạo sub_id, lưu log và Redirect tới link Shopee an_redir
 */
async function redirectShopeeLink(req, res) {
  try {
    const rawOriginUrl = req.query.url;
    const country = (req.query.country || 'VN').toUpperCase();

    if (!rawOriginUrl) {
      return res.status(400).send('Thiếu tham số URL Shopee (?url=)');
    }

    // 1. Validate & giải mã short link nếu có
    validateShopeeUrl(rawOriginUrl, { country, allowShortLink: true });
    const originUrl = await resolveShopeeShortLink(rawOriginUrl, country);

    // 2. Sinh clickId & chuẩn hóa Sub ID (tối đa 5 vị trí)
    const clickId = generateClickId();
    const resolvedUserId = req.user ? req.user.id : (req.query.user_id || req.query.userId || null);
    const rawSubInput = extractSubInputFromRequest(req.query, resolvedUserId || clickId);
    const subId = formatStandardSubId(rawSubInput);

    // 3. Lấy cấu hình Affiliate ID từ CSDL hoặc biến môi trường
    let customBaseUrl = '';
    let dbAffId = '';
    const db = await getDatabase();
    try {
      const settings = await db.get('SELECT shopee_affiliate_id, shopee_cookie_url FROM system_settings WHERE id = 1');
      if (settings) {
        customBaseUrl = settings.shopee_cookie_url || '';
        dbAffId = settings.shopee_affiliate_id || '';
      }
    } catch (sErr) {}

    const targetAffId = req.query.affiliate_id || req.query.affiliateId || dbAffId || process.env.SHOPEE_AFFILIATE_ID || '';
    const validAffId = validateAffiliateId(targetAffId);

    // 4. Tạo link an_redir chuẩn 2026
    const redirectTarget = createShopeeAffiliateLink(originUrl, subId, customBaseUrl, validAffId, country);

    // 5. Ghi log click đầy đủ (kèm shop_id, item_id, sub_id) vào DB
    const { shopId, itemId } = extractShopeeIds(originUrl);
    try {
      await db.run(
        'INSERT INTO click_logs (id, user_id, product_url, sub_id, shop_id, item_id) VALUES (?, ?, ?, ?, ?, ?)',
        [clickId, resolvedUserId, originUrl, subId, shopId || null, itemId || null]
      );
    } catch (dbErr) {
      console.warn('Click log warning:', dbErr.message);
    }

    // 6. Chuyển hướng 302 sang link Shopee an_redir
    return res.redirect(302, redirectTarget);

  } catch (error) {
    return res.status(400).send(`Lỗi chuyển hướng link Shopee: ${error.message}`);
  }
}

/**
 * Tra cứu thông tin sản phẩm Shopee qua AddLiveTag
 */
async function getProductInfo(req, res) {
  try {
    const rawInput = req.query.url || req.query.item_id || req.query.link || req.body?.url || req.body?.item_id;
    if (!rawInput) {
      return res.status(400).json({
        status: 'error',
        code: 'MISSING_INPUT',
        message: 'Thiếu link hoặc ID sản phẩm Shopee'
      });
    }

    let apiKey = process.env.ADDLIVETAG_API_KEY || '';
    try {
      const db = await getDatabase();
      const settings = await db.get('SELECT addlivetag_api_key FROM system_settings WHERE id = 1');
      if (settings && settings.addlivetag_api_key && settings.addlivetag_api_key.trim()) {
        apiKey = settings.addlivetag_api_key.trim();
      }
    } catch (dbErr) {
      console.warn('DB read error in getProductInfo:', dbErr.message);
    }

    if (!apiKey) {
      return res.json({
        status: 'error',
        code: 'MISSING_API_KEY',
        message: 'Hệ thống chưa được cấu hình API Key AddLiveTag. Vui lòng vào Cài đặt Quản trị viên (Admin Panel) để nhập API Key từ addlivetag.com.'
      });
    }

    const result = await fetchProductDataFromAddLiveTag(rawInput, apiKey);
    return res.json(result);
  } catch (err) {
    console.error('getProductInfo Error:', err);
    return res.status(500).json({
      status: 'error',
      code: 'SERVER_ERROR',
      message: err.message || 'Lỗi máy chủ khi tra cứu thông tin sản phẩm'
    });
  }
}

module.exports = {
  convertShopeeLink,
  createAffiliateLink: convertShopeeLink,
  redirectShopeeLink,
  getProductInfo
};
