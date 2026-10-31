const crypto = require('crypto');

/**
 * Danh sách tên miền chính thức của Shopee theo mã quốc gia
 */
const SHOPEE_COUNTRY_DOMAINS = {
  VN: 'shopee.vn',
  ID: 'shopee.co.id',
  TH: 'shopee.co.th',
  MY: 'shopee.com.my',
  PH: 'shopee.ph',
  SG: 'shopee.sg',
  TW: 'shopee.tw',
  BR: 'shopee.com.br',
  MX: 'shopee.com.mx',
  CL: 'shopee.cl',
  CO: 'shopee.com.co'
};

/**
 * Danh sách Endpoint an_redir chuẩn theo từng quốc gia
 */
const SHOPEE_AN_REDIR_DOMAINS = {
  VN: 'https://s.shopee.vn/an_redir',
  ID: 'https://s.shopee.co.id/an_redir',
  TH: 'https://s.shopee.co.th/an_redir',
  MY: 'https://s.shopee.com.my/an_redir',
  PH: 'https://s.shopee.ph/an_redir',
  SG: 'https://s.shopee.sg/an_redir',
  TW: 'https://s.shopee.tw/an_redir',
  BR: 'https://s.shopee.com.br/an_redir',
  MX: 'https://s.shopee.com.mx/an_redir',
  CL: 'https://s.shopee.cl/an_redir',
  CO: 'https://s.shopee.com.co/an_redir'
};

/**
 * Danh sách các domain rút gọn của Shopee (không được dùng trực tiếp làm landing page)
 */
const SHORT_LINK_HOSTS = new Set([
  's.shopee.vn',
  'vn.shp.ee',
  'shp.ee',
  'shope.ee',
  's.shopee.co.id',
  's.shopee.co.th',
  's.shopee.com.my',
  's.shopee.ph',
  's.shopee.sg',
  's.shopee.tw',
  's.shopee.com.br',
  's.shopee.com.mx',
  's.shopee.cl',
  's.shopee.com.co'
]);

/**
 * Đảm bảo ID ở định dạng UUID v4
 * @param {string} idInput
 * @returns {string}
 */
function ensureUuid(idInput) {
  if (!idInput) {
    return crypto.randomUUID();
  }

  const str = String(idInput).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (uuidRegex.test(str)) {
    return str;
  }

  const hash = crypto.createHash('md5').update(str).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

/**
 * Sinh mã tracking clickId độc nhất cho hệ thống
 * @returns {string}
 */
function generateClickId() {
  return 'CLK' + Date.now() + Math.random().toString(36).substring(2, 8);
}

/**
 * Kiểm tra URL có phải là link rút gọn Shopee hay không
 * @param {string} inputUrl
 * @returns {boolean}
 */
function isShopeeShortLink(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return false;
  try {
    const parsed = new URL(inputUrl.trim());
    const host = parsed.hostname.toLowerCase();
    return SHORT_LINK_HOSTS.has(host) || host.endsWith('.shp.ee');
  } catch (e) {
    return false;
  }
}

/**
 * Nhận diện domain và mã quốc gia từ URL Shopee
 * @param {string} inputUrl
 * @returns {{ domain: string, country: string } | null}
 */
function detectShopeeDomainAndCountry(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return null;
  try {
    const raw = inputUrl.trim();
    const parsed = new URL(raw);
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');

    for (const [country, domain] of Object.entries(SHOPEE_COUNTRY_DOMAINS)) {
      if (host === domain) {
        return { domain, country };
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Kiểm tra tính hợp lệ của Affiliate ID
 * - Bắt buộc có giá trị (không tự sinh ID giả)
 * - Chỉ chứa chữ số (5 - 20 ký tự số)
 *
 * @param {string|number} affiliateId
 * @returns {string} Affiliate ID hợp lệ
 */
function validateAffiliateId(affiliateId) {
  if (affiliateId === undefined || affiliateId === null) {
    throw new Error('Thiếu Affiliate ID (affiliate_id là bắt buộc)');
  }

  const cleanId = String(affiliateId).trim();
  if (!cleanId) {
    throw new Error('Thiếu Affiliate ID (affiliate_id không được để trống)');
  }

  if (!/^\d{5,20}$/.test(cleanId)) {
    throw new Error(`Affiliate ID không hợp lệ: "${cleanId}" (chỉ cho phép chữ số từ 5-20 ký tự)`);
  }

  return cleanId;
}

/**
 * Kiểm tra URL đầu vào có thuộc Shopee của quốc gia mục tiêu hay không
 * (Chấp nhận cả short link khi dùng ở bước pre-validate trước khi resolveShortLink)
 *
 * @param {string} inputUrl
 * @param {Object} [options]
 * @param {string} [options.country='VN']
 * @param {boolean} [options.allowShortLink=false]
 * @returns {URL}
 */
function validateShopeeUrl(inputUrl, options = {}) {
  const expectedCountry = (options.country || 'VN').toUpperCase();
  const allowShortLink = Boolean(options.allowShortLink);

  if (!inputUrl || typeof inputUrl !== 'string' || !inputUrl.trim()) {
    throw new Error('Thiếu URL Shopee');
  }

  const raw = inputUrl.trim();

  // Phát hiện trường hợp URL đã bị encode toàn bộ (ví dụ: https%3A%2F%2Fshopee.vn...)
  if (/^https?%3A%2F%2F/i.test(raw)) {
    throw new Error('URL đầu vào đang bị URL Encode sẵn (nguy cơ double encoding)');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(raw);
  } catch (err) {
    throw new Error('URL không hợp lệ');
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Giao thức URL không hợp lệ (chỉ hỗ trợ http/https)');
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  const expectedDomain = SHOPEE_COUNTRY_DOMAINS[expectedCountry];
  if (!expectedDomain) {
    throw new Error(`Mã quốc gia không được hỗ trợ: ${expectedCountry}`);
  }

  // Kiểm tra link rút gọn
  if (SHORT_LINK_HOSTS.has(hostname) || hostname.endsWith('.shp.ee')) {
    if (!allowShortLink) {
      throw new Error('Không sử dụng link rút gọn làm landing page. Cần giải mã về link sản phẩm gốc trước.');
    }
    return parsedUrl;
  }

  // Kiểm tra đúng domain quốc gia (ví dụ: shopee.vn hoặc www.shopee.vn)
  const normalizedHost = hostname.replace(/^www\./, '');
  if (normalizedHost !== expectedDomain) {
    throw new Error(`Sai domain quốc gia: Yêu cầu "${expectedDomain}" (${expectedCountry}) nhưng nhận được "${hostname}"`);
  }

  // Chặn Universal Link
  if (parsedUrl.pathname.toLowerCase().includes('universal-link')) {
    throw new Error('Không được sử dụng universal-link làm landing page');
  }

  return parsedUrl;
}

/**
 * Giải mã URI an toàn: giải mã các chuỗi percent-encoded hợp lệ (%XX) ngay cả khi trong chuỗi
 * có ký tự '%' đơn lẻ (ví dụ: "100%-Cotton") mà không làm văng lỗi URIError.
 * @param {string} str
 * @returns {string}
 */
function safeDecodeURIComponent(str) {
  if (!str || typeof str !== 'string') return '';
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decodeURIComponent(match);
      } catch {
        return match;
      }
    });
  }
}

/**
 * Làm sạch và chuẩn hóa Landing Page sản phẩm Shopee chuẩn 2026.
 *
 * Chỉ chấp nhận 2 định dạng sản phẩm:
 * - Dạng 1: https://shopee.vn/<slug>-i.<shop_id>.<item_id>
 * - Dạng 2: https://shopee.vn/product/<shop_id>/<item_id>
 *
 * Yêu cầu:
 * - Loại bỏ toàn bộ query tracking (utm_*, gads_*, sp_atk, xptdk, ...) và fragment (#...)
 * - Không sử dụng universal-link
 * - Không sử dụng link rút gọn làm landing page
 * - Không tự ý thay đổi shop_id và item_id (không gán shop_id = 0)
 * - Kiểm tra đúng domain quốc gia
 * - Giải mã percent-encoding trên slug (nếu có) về dạng chuẩn để tránh double encoding khi tạo an_redir
 *
 * @param {string} inputUrl
 * @param {Object} [options]
 * @param {string} [options.country='VN']
 * @returns {string} Clean landing page URL
 */
function normalizeShopeeProductUrl(inputUrl, options = {}) {
  const expectedCountry = (options.country || 'VN').toUpperCase();
  const parsedUrl = validateShopeeUrl(inputUrl, { country: expectedCountry, allowShortLink: false });
  const expectedDomain = SHOPEE_COUNTRY_DOMAINS[expectedCountry];

  // Giải mã pathname an toàn để tránh bị double encoding ở bước encodeURIComponent(origin_link)
  const decodedPath = safeDecodeURIComponent(parsedUrl.pathname);

  // Bỏ dấu '/' dư ở đầu và cuối
  const cleanPath = decodedPath.replace(/^\/+|\/+$/g, '');

  if (!cleanPath) {
    throw new Error('Link sai định dạng sản phẩm: Thiếu đường dẫn sản phẩm');
  }

  // Chặn tuyệt đối universal-link hoặc an_redir lồng nhau
  if (/universal-link/i.test(cleanPath) || /an_redir/i.test(cleanPath)) {
    throw new Error('Không được sử dụng universal-link hoặc an_redir làm landing page');
  }

  // Dạng 2: https://shopee.vn/product/<shop_id>/<item_id>
  // Cho phép có thêm hậu tố hợp lệ hoặc chỉ đúng /product/<shop_id>/<item_id>
  const matchFormat2 = cleanPath.match(/^product\/([1-9]\d*)\/([1-9]\d*)$/);
  if (matchFormat2) {
    const shopId = matchFormat2[1];
    const itemId = matchFormat2[2];
    return `https://${expectedDomain}/product/${shopId}/${itemId}`;
  }

  // Dạng 1: https://shopee.vn/<slug>-i.<shop_id>.<item_id>
  // Lưu ý: <slug> không được chứa dấu '/' (không phải thư mục con như universal-link/...)
  const matchFormat1 = cleanPath.match(/^([^\/]+)-i\.([1-9]\d*)\.([1-9]\d*)$/);
  if (matchFormat1) {
    const rawSlug = matchFormat1[1].trim();
    const shopId = matchFormat1[2];
    const itemId = matchFormat1[3];

    if (!rawSlug) {
      throw new Error('Link sai định dạng sản phẩm: Slug sản phẩm rỗng');
    }

    // Chuẩn hóa khoảng trắng trong slug (nếu có) thành '-' để URL hợp lệ mà không đổi shop_id/item_id
    const safeSlug = rawSlug.replace(/\s+/g, '-');
    return `https://${expectedDomain}/${safeSlug}-i.${shopId}.${itemId}`;
  }

  throw new Error(
    `Link sai định dạng sản phẩm Shopee. Chỉ chấp nhận "https://${expectedDomain}/<slug>-i.<shop_id>.<item_id>" hoặc "https://${expectedDomain}/product/<shop_id>/<item_id>"`
  );
}

/**
 * Trích xuất Shop ID và Item ID từ link sản phẩm Shopee
 * @param {string} inputUrl
 * @returns {{ shopId: string, itemId: string }}
 */
function extractShopeeIds(inputUrl) {
  if (!inputUrl || typeof inputUrl !== 'string') return { shopId: '', itemId: '' };
  const str = inputUrl.trim();

  // Dạng 1: <slug>-i.<shop_id>.<item_id>
  const matchFormat1 = str.match(/-i\.([1-9]\d*)\.([1-9]\d*)(?:[/?#]|$)/);
  if (matchFormat1) {
    return { shopId: matchFormat1[1], itemId: matchFormat1[2] };
  }

  // Dạng 2: /product/<shop_id>/<item_id>
  const matchFormat2 = str.match(/\/product\/([1-9]\d*)\/([1-9]\d*)(?:[/?#]|$)/);
  if (matchFormat2) {
    return { shopId: matchFormat2[1], itemId: matchFormat2[2] };
  }

  return { shopId: '', itemId: '' };
}

/**
 * Làm sạch từng thành phần đơn lẻ (sub1..sub5) của Sub ID:
 * - Chuyển ký tự tiếng Việt có dấu sang không dấu (ví dụ: "Nguyễn" -> "Nguyen", "đ" -> "d")
 * - Loại bỏ hoặc thay thế dấu gạch ngang '-' bên trong từng giá trị để không làm xô lệch vị trí phân cách
 * - Chỉ giữ lại các ký tự chữ và số, dấu gạch dưới [a-zA-Z0-9_]
 *
 * @param {string|number} val
 * @param {Object} [options]
 * @param {boolean} [options.rejectHyphenInValue=false] - Nếu true, ném lỗi khi giá trị đơn lẻ chứa dấu '-'
 * @param {boolean} [options.rejectVietnamese=false] - Nếu true, ném lỗi khi chứa ký tự tiếng Việt có dấu
 * @returns {string}
 */
function sanitizeSubIdPart(val, options = {}) {
  if (val === undefined || val === null) return '';
  let str = String(val).trim();
  if (!str) return '';

  if (options.rejectHyphenInValue && str.includes('-')) {
    throw new Error(`Giá trị Sub ID thành phần "${str}" không được chứa dấu gạch ngang "-"`);
  }

  const hasVietnamese = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/.test(str);
  if (options.rejectVietnamese && hasVietnamese) {
    throw new Error(`Giá trị Sub ID thành phần "${str}" chứa ký tự tiếng Việt có dấu không hợp lệ`);
  }

  // Chuyển tiếng Việt có dấu sang không dấu
  str = str
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  // Không để dấu '-' bên trong từng giá trị (loại bỏ '-' hoặc khoảng trắng)
  str = str
    .replace(/-/g, '')
    .replace(/\s+/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .substring(0, 50);

  return str;
}

/**
 * Chuẩn hóa Sub ID cho Shopee Affiliate (Hỗ trợ tối đa 5 vị trí):
 * - sub1: Publisher/KOL
 * - sub2: Campaign
 * - sub3: Source
 * - sub4: Post/Video ID
 * - sub5: Custom/Remark
 *
 * Quy tắc:
 * - Phân cách bằng dấu `-`
 * - Không để dấu `-` bên trong từng giá trị
 * - Nếu thiếu vị trí ở giữa phải giữ nguyên vị trí bằng dấu phân cách (ví dụ: `kolA-summer26--post123-note`)
 * - Không tự ý đảo thứ tự
 * - Không tự ý gộp các vị trí
 * - Không tạo Sub ID vượt quá 5 vị trí
 *
 * @param {string|Array|Object} subInput
 * @param {Object} [options]
 * @param {boolean} [options.rejectHyphenInValue=false]
 * @param {boolean} [options.rejectVietnamese=false]
 * @returns {string} Chuỗi Sub ID chuẩn hóa
 */
function formatStandardSubId(subInput, options = {}) {
  if (subInput === undefined || subInput === null || subInput === '') {
    return '';
  }

  let rawParts = [];

  if (Array.isArray(subInput)) {
    if (subInput.length > 5) {
      throw new Error(`Sub ID vượt quá giới hạn cho phép: Tối đa 5 vị trí nhưng nhận được ${subInput.length} vị trí`);
    }
    rawParts = subInput.map(item => sanitizeSubIdPart(item, options));
  } else if (typeof subInput === 'object') {
    // Kiểm tra nếu truyền sub6 trở lên
    const extraKeys = Object.keys(subInput).filter(k => /^sub_?(?:id)?([6-9]|\d{2,})$/i.test(k));
    if (extraKeys.length > 0) {
      throw new Error('Sub ID vượt quá giới hạn cho phép: Tối đa 5 vị trí (sub1..sub5)');
    }

    const s1 = subInput.sub1 ?? subInput.sub_id1 ?? subInput.publisher ?? subInput.userId ?? subInput.user_id ?? '';
    const s2 = subInput.sub2 ?? subInput.sub_id2 ?? subInput.campaign ?? '';
    const s3 = subInput.sub3 ?? subInput.sub_id3 ?? subInput.source ?? '';
    const s4 = subInput.sub4 ?? subInput.sub_id4 ?? subInput.postId ?? subInput.videoId ?? '';
    const s5 = subInput.sub5 ?? subInput.sub_id5 ?? subInput.custom ?? subInput.remark ?? '';

    rawParts = [
      sanitizeSubIdPart(s1, options),
      sanitizeSubIdPart(s2, options),
      sanitizeSubIdPart(s3, options),
      sanitizeSubIdPart(s4, options),
      sanitizeSubIdPart(s5, options)
    ];
  } else if (typeof subInput === 'string' || typeof subInput === 'number') {
    const str = String(subInput).trim();
    if (!str) return '';

    const splitParts = str.split('-');
    if (splitParts.length > 5) {
      throw new Error(`Sub ID không hợp lệ ("${str}"): Vượt quá tối đa 5 vị trí hoặc chứa dấu gạch ngang "-" làm lệch cấu trúc`);
    }
    rawParts = splitParts.map(part => sanitizeSubIdPart(part, options));
  } else {
    throw new Error('Định dạng đầu vào Sub ID không hợp lệ');
  }

  // Tìm vị trí cuối cùng có dữ liệu để bảo toàn mọi dấu '-' giữ chỗ ở giữa
  let lastNonEmptyIndex = -1;
  for (let i = rawParts.length - 1; i >= 0; i--) {
    if (rawParts[i] !== '') {
      lastNonEmptyIndex = i;
      break;
    }
  }

  if (lastNonEmptyIndex === -1) {
    return '';
  }

  // Giữ nguyên thứ tự từ sub1 tới vị trí có giá trị cuối cùng (bảo toàn vị trí trống ở giữa bằng dấu '-')
  return rawParts.slice(0, lastNonEmptyIndex + 1).join('-');
}

/**
 * Xử lý giải mã short link Shopee (vn.shp.ee, s.shopee.vn, shope.ee) thành URL sản phẩm gốc
 * trước khi đưa vào bộ tạo link an_redir.
 *
 * @param {string} inputUrl
 * @param {string} [country='VN']
 * @returns {Promise<string>}
 */
async function resolveShopeeShortLink(inputUrl, country = 'VN') {
  if (!inputUrl || typeof inputUrl !== 'string') {
    throw new Error('Thiếu URL Shopee');
  }

  const trimmed = inputUrl.trim();
  if (isShopeeShortLink(trimmed)) {
    let resolvedUrl = '';
    try {
      const response = await fetch(trimmed, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'follow'
      });

      if (response && response.url && response.url !== trimmed) {
        resolvedUrl = response.url;
      }
    } catch (err) {
      throw new Error(`Không thể giải mã link rút gọn Shopee (${trimmed}): ${err.message}`);
    }

    if (!resolvedUrl || isShopeeShortLink(resolvedUrl)) {
      throw new Error('Không được sử dụng link rút gọn làm landing page (không thể phân giải về link sản phẩm gốc)');
    }

    return normalizeShopeeProductUrl(resolvedUrl, { country });
  }

  return normalizeShopeeProductUrl(trimmed, { country });
}

/**
 * Quy trình tạo link Shopee Affiliate chuẩn 2026 theo cơ chế an_redir:
 * Cấu trúc bắt buộc:
 * https://s.shopee.vn/an_redir?origin_link=<ENCODED_LANDING>&affiliate_id=<AFFILIATE_ID>&sub_id=<SUB_ID>
 *
 * @param {Object} options
 * @param {string} options.originUrl - Link sản phẩm Shopee gốc
 * @param {string} options.affiliateId - Shopee Affiliate ID (bắt buộc)
 * @param {string|Object|Array} [options.subParams=''] - Cấu trúc Sub ID tối đa 5 vị trí
 * @param {string} [options.country='VN'] - Mã quốc gia (mặc định 'VN')
 * @param {Object} [options.subIdOptions={}] - Tùy chọn kiểm tra nghiêm ngặt Sub ID
 * @returns {{ finalUrl: string, cleanLanding: string, encodedLanding: string, affiliateId: string, subId: string, domainUrl: string }}
 */
function buildShopeeAnRedirLink({
  originUrl,
  affiliateId,
  subParams = '',
  country = 'VN',
  subIdOptions = {}
} = {}) {
  if (!originUrl || typeof originUrl !== 'string' || !originUrl.trim()) {
    throw new Error('Thiếu link sản phẩm Shopee gốc (originUrl)');
  }

  // Bước 1: Kiểm tra Affiliate ID (Không tự ý tạo Affiliate ID giả)
  const validAffId = validateAffiliateId(affiliateId);

  // Bước 2: Kiểm tra domain quốc gia và làm sạch Landing Page (Chỉ chấp nhận 2 định dạng chuẩn)
  const cKey = (country || 'VN').toUpperCase();
  const domainUrl = SHOPEE_AN_REDIR_DOMAINS[cKey];
  if (!domainUrl) {
    throw new Error(`Không hỗ trợ endpoint an_redir cho quốc gia: ${cKey}`);
  }

  const cleanLanding = normalizeShopeeProductUrl(originUrl, { country: cKey });

  // Bước 3: Encode toàn bộ landing page đúng 1 lần duy nhất
  const encodedLanding = encodeURIComponent(cleanLanding);

  // Kiểm tra bảo toàn URL Encode / Decode (Chống double encoding & mất ký tự)
  if (encodedLanding.includes('%253A') || encodedLanding.includes('%252F')) {
    throw new Error('Phát hiện lỗi Double Encoding trên origin_link');
  }
  if (decodeURIComponent(encodedLanding) !== cleanLanding) {
    throw new Error('Lỗi bảo toàn URL Encode/Decode: Giải mã không khớp với landing page gốc');
  }

  // Bước 4: Chuẩn hóa Sub ID tối đa 5 vị trí (sub1-sub2-sub3-sub4-sub5)
  const formattedSubId = formatStandardSubId(subParams, subIdOptions);

  // Bước 5: Ghép URL theo đúng cấu trúc và thứ tự tham số bắt buộc của an_redir:
  // https://s.shopee.vn/an_redir?origin_link=<ENCODED_LANDING>&affiliate_id=<AFFILIATE_ID>&sub_id=<SUB_ID>
  const finalUrl = `${domainUrl}?origin_link=${encodedLanding}&affiliate_id=${validAffId}&sub_id=${formattedSubId}`;

  return {
    finalUrl,
    cleanLanding,
    encodedLanding,
    affiliateId: validAffId,
    subId: formattedSubId,
    domainUrl
  };
}

/**
 * Kiểm tra cấu trúc URL đầu ra có đúng chuẩn an_redir hay không
 * @param {string} outputUrl
 * @param {string} [country='VN']
 * @returns {{ valid: boolean, error?: string, parsed?: Object }}
 */
function verifyAnRedirOutputUrl(outputUrl, country = 'VN') {
  try {
    if (!outputUrl || typeof outputUrl !== 'string') {
      return { valid: false, error: 'URL đầu ra rỗng hoặc không phải chuỗi' };
    }

    const expectedEndpoint = SHOPEE_AN_REDIR_DOMAINS[(country || 'VN').toUpperCase()];
    if (!outputUrl.startsWith(`${expectedEndpoint}?`)) {
      return { valid: false, error: `Sai endpoint an_redir (yêu cầu bắt đầu bằng ${expectedEndpoint}?)` };
    }

    const parsed = new URL(outputUrl);
    const paramKeys = Array.from(parsed.searchParams.keys());

    // Kiểm tra đúng thứ tự và danh sách tham số: origin_link, affiliate_id, sub_id
    const expectedKeys = ['origin_link', 'affiliate_id', 'sub_id'];
    if (
      paramKeys.length !== expectedKeys.length ||
      paramKeys[0] !== 'origin_link' ||
      paramKeys[1] !== 'affiliate_id' ||
      paramKeys[2] !== 'sub_id'
    ) {
      return {
        valid: false,
        error: `Sai thứ tự hoặc dư/thiếu tham số trên an_redir. Thực tế: [${paramKeys.join(', ')}]`
      };
    }

    // Kiểm tra raw query không bị encode 2 lần (%25)
    const rawQuery = outputUrl.split('?')[1] || '';
    const rawOriginMatch = rawQuery.match(/^origin_link=([^&]+)&affiliate_id=([^&]+)&sub_id=(.*)$/);
    if (!rawOriginMatch) {
      return { valid: false, error: 'Cấu trúc query string không khớp chuẩn origin_link, affiliate_id, sub_id' };
    }

    const rawEncodedOrigin = rawOriginMatch[1];
    if (/^https?%253A%252F%252F/i.test(rawEncodedOrigin) || /%25(?:C[2-9A-F]|D[0-9A-F]|E[0-9A-F])[0-9A-F]{2}/i.test(rawEncodedOrigin)) {
      return { valid: false, error: 'origin_link bị encode 2 lần (Double Encoding)' };
    }

    const decodedOrigin = decodeURIComponent(rawEncodedOrigin);
    const cleanCheck = normalizeShopeeProductUrl(decodedOrigin, { country });
    if (decodedOrigin !== cleanCheck) {
      return { valid: false, error: `origin_link sau khi decode không phải landing page sạch: ${decodedOrigin}` };
    }

    const affId = validateAffiliateId(rawOriginMatch[2]);
    const rawSubId = rawOriginMatch[3];
    if (rawSubId) {
      const subParts = rawSubId.split('-');
      if (subParts.length > 5) {
        return { valid: false, error: 'sub_id vượt quá 5 vị trí' };
      }
    }

    return {
      valid: true,
      parsed: {
        endpoint: expectedEndpoint,
        originLink: decodedOrigin,
        encodedOriginLink: rawEncodedOrigin,
        affiliateId: affId,
        subId: rawSubId
      }
    };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Hàm tương thích cho Controller tạo link Shopee Affiliate
 * @param {string} originUrl
 * @param {string|Object|Array} [subId='']
 * @param {string} [customBaseUrl='']
 * @param {string} [customAffId='']
 * @param {string} [country='VN']
 * @returns {string}
 */
function createShopeeAffiliateLink(originUrl, subId = '', customBaseUrl = '', customAffId = '', country = 'VN') {
  const affId = customAffId || process.env.SHOPEE_AFFILIATE_ID || '';
  const result = buildShopeeAnRedirLink({
    originUrl,
    affiliateId: affId,
    subParams: subId,
    country
  });
  return result.finalUrl;
}

/**
 * Tra cứu thông tin sản phẩm và hoa hồng từ AddLiveTag API
 * @param {string} linkOrId - URL Shopee hoặc item ID
 * @param {string} apiKey - API Key AddLiveTag
 * @returns {Promise<Object>}
 */
async function fetchProductDataFromAddLiveTag(linkOrId, apiKey) {
  const cleanKey = (apiKey || '').trim();
  if (!cleanKey) {
    return {
      status: 'error',
      code: 'MISSING_API_KEY',
      message: 'Chưa cấu hình API Key AddLiveTag. Vui lòng cấu hình trong Admin Panel hoặc biến môi trường ADDLIVETAG_API_KEY.'
    };
  }

  const cleanInput = (linkOrId || '').trim();
  if (!cleanInput) {
    return {
      status: 'error',
      code: 'MISSING_INPUT',
      message: 'Vui lòng cung cấp link hoặc ID sản phẩm Shopee.'
    };
  }

  // Tự động phân giải short link Shopee (nếu có) trước khi truy vấn
  let resolvedUrl = cleanInput;
  const isItemId = /^\d+$/.test(cleanInput);
  if (!isItemId && isShopeeShortLink(cleanInput)) {
    try {
      resolvedUrl = await resolveShopeeShortLink(cleanInput);
    } catch (e) {
      resolvedUrl = cleanInput;
    }
  }

  const queryParam = isItemId ? `item_id=${cleanInput}` : `url=${encodeURIComponent(resolvedUrl)}`;
  const apiUrl = `https://data.addlivetag.com/product-data/product-data.php?${queryParam}&key=${encodeURIComponent(cleanKey)}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': cleanKey,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.status === 429) {
      return {
        status: 'error',
        code: 'RATE_LIMIT',
        message: 'API AddLiveTag đang bị quá tải (Rate limit 429).'
      };
    }

    const data = await response.json();
    if (data && data.productInfo) {
      if (data.productInfo.commission !== undefined && data.productInfo.commission !== null) {
        data.productInfo.commission = Math.floor(Number(data.productInfo.commission) || 0);
      }
      if (data.productInfo.sellerComFinal !== undefined && data.productInfo.sellerComFinal !== null) {
        data.productInfo.sellerComFinal = Math.floor(Number(data.productInfo.sellerComFinal) || 0);
      }
      if (data.productInfo.shopeeComFinal !== undefined && data.productInfo.shopeeComFinal !== null) {
        data.productInfo.shopeeComFinal = Math.floor(Number(data.productInfo.shopeeComFinal) || 0);
      }
      if (data.productInfo.price !== undefined && data.productInfo.price !== null) {
        data.productInfo.price = Math.floor(Number(data.productInfo.price) || 0);
      }
      const rawComm = Math.max(
        Number(data.productInfo.commission) || 0,
        (Number(data.productInfo.sellerComFinal) || 0) + (Number(data.productInfo.shopeeComFinal) || 0)
      );
      data.productInfo.commission = rawComm;
      data.productInfo.totalCommission = rawComm;
      data.productInfo.estimatedCashback = Math.floor(rawComm * 0.5);
    }
    return data;
  } catch (err) {
    console.error('Fetch AddLiveTag Error:', err.message);
    return {
      status: 'error',
      code: 'NETWORK_ERROR',
      message: `Lỗi kết nối tới AddLiveTag: ${err.message}`
    };
  }
}

module.exports = {
  SHOPEE_COUNTRY_DOMAINS,
  SHOPEE_AN_REDIR_DOMAINS,
  SHORT_LINK_HOSTS,
  ensureUuid,
  isShopeeShortLink,
  detectShopeeDomainAndCountry,
  validateAffiliateId,
  validateShopeeUrl,
  generateClickId,
  normalizeShopeeProductUrl,
  resolveShopeeShortLink,
  sanitizeSubIdPart,
  formatStandardSubId,
  buildShopeeAnRedirLink,
  verifyAnRedirOutputUrl,
  createShopeeAffiliateLink,
  generateShopeeAffiliateLink: createShopeeAffiliateLink,
  fetchProductDataFromAddLiveTag,
  extractShopeeIds
};
