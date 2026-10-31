/**
 * BỘ TEST TỰ ĐỘNG KIỂM TRA CHỨC NĂNG TẠO LINK SHOPEE AFFILIATE 2026 (an_redir)
 * Bao phủ đầy đủ 16 kịch bản kiểm thử bắt buộc
 */

const assert = require('assert');
const {
  validateAffiliateId,
  validateShopeeUrl,
  normalizeShopeeProductUrl,
  formatStandardSubId,
  buildShopeeAnRedirLink,
  verifyAnRedirOutputUrl,
  extractShopeeIds
} = require('../src/services/shopeeService');

const TEST_AFF_ID = '173401900099';
const results = [];

function runTest(id, name, fn) {
  try {
    const detail = fn();
    results.push({ id, name, status: 'PASS', detail: detail || 'Đạt yêu cầu' });
  } catch (err) {
    results.push({ id, name, status: 'FAIL', detail: err.message });
  }
}

// 1. Link sản phẩm Shopee sạch (Dạng 1 & Dạng 2)
runTest(1, 'Link sản phẩm Shopee sạch (Dạng 1 & Dạng 2)', () => {
  const url1 = 'https://shopee.vn/Ao-thun-nam-form-rong-i.12345678.987654321';
  const res1 = buildShopeeAnRedirLink({
    originUrl: url1,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA-summer26-fb-post123-note'
  });
  assert.strictEqual(res1.cleanLanding, url1);
  assert.strictEqual(
    res1.finalUrl,
    `https://s.shopee.vn/an_redir?origin_link=${encodeURIComponent(url1)}&affiliate_id=${TEST_AFF_ID}&sub_id=kolA-summer26-fb-post123-note`
  );

  const url2 = 'https://shopee.vn/product/12345678/987654321';
  const res2 = buildShopeeAnRedirLink({
    originUrl: url2,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA'
  });
  assert.strictEqual(res2.cleanLanding, url2);
  const ids = extractShopeeIds(res2.cleanLanding);
  assert.strictEqual(ids.shopId, '12345678');
  assert.strictEqual(ids.itemId, '987654321');
  return `Dạng 1 & Dạng 2 giữ nguyên shop_id=12345678, item_id=987654321`;
});

// 2. Link có UTM tracking
runTest(2, 'Link có UTM tracking', () => {
  const dirtyUrl = 'https://shopee.vn/product/12345678/987654321?utm_source=facebook&utm_medium=cpc&utm_campaign=sale1010&utm_term=deal&utm_content=banner1';
  const res = buildShopeeAnRedirLink({
    originUrl: dirtyUrl,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA-sale1010-fb'
  });
  assert.strictEqual(res.cleanLanding, 'https://shopee.vn/product/12345678/987654321');
  assert.ok(!res.cleanLanding.includes('utm_'));
  assert.ok(!res.encodedLanding.includes('utm_'));
  return `Đã loại bỏ 100% utm_* -> ${res.cleanLanding}`;
});

// 3. Link có gads tracking & tham số quảng cáo (sp_atk, xptdk)
runTest(3, 'Link có gads tracking và tham số quảng cáo', () => {
  const dirtyUrl = 'https://shopee.vn/Tai-nghe-bluetooth-i.888999.111222333?gads_t_sig=VTJGc2RHVmtYMTlxTFVSVVRrdENkWVp3&sp_atk=9f8e7d6c&xptdk=1a2b3c4d& gad_source=1&gclid=Cj0KCQjw';
  const res = buildShopeeAnRedirLink({
    originUrl: dirtyUrl,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA'
  });
  assert.strictEqual(res.cleanLanding, 'https://shopee.vn/Tai-nghe-bluetooth-i.888999.111222333');
  assert.ok(!res.cleanLanding.includes('gads_'));
  assert.ok(!res.cleanLanding.includes('sp_atk'));
  return `Đã loại bỏ gads_*, sp_atk, xptdk, gclid -> ${res.cleanLanding}`;
});

// 4. Link sai domain quốc gia
runTest(4, 'Link sai domain quốc gia', () => {
  let threw = false;
  let errMsg = '';
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://shopee.sg/product/123456/789012',
      affiliateId: TEST_AFF_ID,
      country: 'VN'
    });
  } catch (err) {
    threw = true;
    errMsg = err.message;
  }
  assert.ok(threw, 'Phải từ chối link shopee.sg khi tạo link quốc gia VN');
  return `Chặn thành công: ${errMsg}`;
});

// 5. Link universal
runTest(5, 'Link universal (universal-link)', () => {
  let threw = false;
  let errMsg = '';
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://shopee.vn/universal-link/product/123456/789012?deep_and_deferred=1',
      affiliateId: TEST_AFF_ID
    });
  } catch (err) {
    threw = true;
    errMsg = err.message;
  }
  assert.ok(threw, 'Phải từ chối link universal-link');
  return `Chặn thành công: ${errMsg}`;
});

// 6. Link rút gọn làm landing page trực tiếp
runTest(6, 'Link rút gọn (vn.shp.ee / s.shopee.vn)', () => {
  let threw1 = false;
  let threw2 = false;
  let errMsg = '';
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://vn.shp.ee/abcXYZ123',
      affiliateId: TEST_AFF_ID
    });
  } catch (err) {
    threw1 = true;
    errMsg = err.message;
  }
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://s.shopee.vn/4f8abcXYZ',
      affiliateId: TEST_AFF_ID
    });
  } catch (err) {
    threw2 = true;
  }
  assert.ok(threw1 && threw2, 'Phải từ chối link rút gọn khi truyền trực tiếp làm landing page');
  return `Chặn thành công: ${errMsg}`;
});

// 7. Link sai định dạng sản phẩm
runTest(7, 'Link sai định dạng sản phẩm', () => {
  const invalidProductUrls = [
    'https://shopee.vn/flash_sale',
    'https://shopee.vn/mall',
    'https://shopee.vn/shop/12345678',
    'https://shopee.vn/product/0/987654321',
    'https://shopee.vn/product/-/-.987654321',
    'https://shopee.vn/product/abc/def'
  ];

  for (const invalidUrl of invalidProductUrls) {
    let threw = false;
    try {
      buildShopeeAnRedirLink({
        originUrl: invalidUrl,
        affiliateId: TEST_AFF_ID
      });
    } catch (err) {
      threw = true;
    }
    assert.ok(threw, `Phải từ chối URL sai định dạng sản phẩm: ${invalidUrl}`);
  }
  return `Chặn toàn bộ ${invalidProductUrls.length} dạng URL không phải sản phẩm hợp lệ`;
});

// 8. Affiliate ID bị thiếu
runTest(8, 'Affiliate ID bị thiếu', () => {
  let threwEmpty = false;
  let threwNull = false;
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://shopee.vn/product/123456/789012',
      affiliateId: ''
    });
  } catch (err) {
    threwEmpty = true;
  }
  try {
    buildShopeeAnRedirLink({
      originUrl: 'https://shopee.vn/product/123456/789012',
      affiliateId: undefined
    });
  } catch (err) {
    threwNull = true;
  }
  assert.ok(threwEmpty && threwNull, 'Phải báo lỗi khi thiếu Affiliate ID, không tự sinh ID giả');
  return 'Chặn thành công khi affiliateId rỗng hoặc undefined';
});

// 9. Affiliate ID chứa ký tự không hợp lệ
runTest(9, 'Affiliate ID chứa ký tự không hợp lệ', () => {
  const invalidAffIds = ['173401900099abc', 'aff_123456', '123-456-789', '<script>', '123'];
  for (const badId of invalidAffIds) {
    let threw = false;
    try {
      validateAffiliateId(badId);
    } catch (err) {
      threw = true;
    }
    assert.ok(threw, `Phải từ chối Affiliate ID không hợp lệ: ${badId}`);
  }
  return `Chặn toàn bộ Affiliate ID chứa chữ cái/ký tự đặc biệt/sai độ dài`;
});

// 10. Sub ID đủ 5 vị trí
runTest(10, 'Sub ID đủ 5 vị trí', () => {
  const subFromStr = formatStandardSubId('kolA-summer26-fb-post123-note');
  assert.strictEqual(subFromStr, 'kolA-summer26-fb-post123-note');

  const subFromObj = formatStandardSubId({
    sub1: 'kolA',
    sub2: 'summer26',
    sub3: 'fb',
    sub4: 'post123',
    sub5: 'note'
  });
  assert.strictEqual(subFromObj, 'kolA-summer26-fb-post123-note');

  const subFromArr = formatStandardSubId(['kolA', 'summer26', 'fb', 'post123', 'note']);
  assert.strictEqual(subFromArr, 'kolA-summer26-fb-post123-note');

  // Kiểm tra vượt quá 5 vị trí phải bị chặn
  let threwOver5 = false;
  try {
    formatStandardSubId('s1-s2-s3-s4-s5-s6');
  } catch (err) {
    threwOver5 = true;
  }
  assert.ok(threwOver5, 'Phải chặn Sub ID vượt quá 5 vị trí');
  return `Chuẩn hóa chính xác: ${subFromStr} (và chặn > 5 vị trí)`;
});

// 11. Sub ID thiếu vị trí ở giữa
runTest(11, 'Sub ID thiếu vị trí ở giữa', () => {
  const subStr = formatStandardSubId('kolA-summer26--post123-note');
  assert.strictEqual(subStr, 'kolA-summer26--post123-note');

  const subObj = formatStandardSubId({
    sub1: 'kolA',
    sub2: 'summer26',
    sub3: '',
    sub4: 'post123',
    sub5: 'note'
  });
  assert.strictEqual(subObj, 'kolA-summer26--post123-note');

  const subArr = formatStandardSubId(['kolA', '', '', 'post123', '']);
  assert.strictEqual(subArr, 'kolA---post123');
  return `Bảo toàn dấu phân cách ở vị trí khuyết: ${subStr}`;
});

// 12. Sub ID có ký tự tiếng Việt
runTest(12, 'Sub ID có ký tự tiếng Việt', () => {
  const sub = formatStandardSubId({
    sub1: 'Nguyễn Văn Đạt',
    sub2: 'Chiến dịch Hè 26',
    sub3: 'Phở bò',
    sub4: 'video123',
    sub5: 'ghi chú'
  });
  assert.strictEqual(sub, 'NguyenVanDat-ChiendichHe26-Phobo-video123-ghichu');
  return `Chuyển đổi tiếng Việt có dấu sang không dấu an toàn: ${sub}`;
});

// 13. Sub ID chứa dấu gạch ngang bên trong từng giá trị
runTest(13, 'Sub ID chứa dấu gạch ngang bên trong từng giá trị', () => {
  // Khi truyền theo từng vị trí (Object/Array), dấu '-' bên trong từng phần tử bị loại bỏ để không làm lệch vị trí
  const subClean = formatStandardSubId({
    sub1: 'kol-A',
    sub2: 'summer-26',
    sub3: 'fb-ads',
    sub4: 'post-123',
    sub5: 'note-1'
  });
  assert.strictEqual(subClean, 'kolA-summer26-fbads-post123-note1');
  assert.strictEqual(subClean.split('-').length, 5);

  // Khi bật cờ rejectHyphenInValue = true, ném lỗi ngay nếu giá trị đơn lẻ chứa dấu '-'
  let threwStrict = false;
  try {
    formatStandardSubId({ sub1: 'kol-A', sub2: 'summer26' }, { rejectHyphenInValue: true });
  } catch (err) {
    threwStrict = true;
  }
  assert.ok(threwStrict, 'Chế độ strict phải từ chối giá trị thành phần có dấu gạch ngang');
  return `Xử lý an toàn không lệch vị trí: ${subClean}`;
});

// 14. Link có ký tự đặc biệt (Tiếng Việt / Ngoặc / Phần trăm đã encode trên slug)
runTest(14, 'Link có ký tự đặc biệt trong slug', () => {
  const specialUrl = 'https://shopee.vn/Áo-Thun-Nam-(Cao-Cấp)-100%-Cotton-i.123456.789012?sp_atk=abc';
  const res = buildShopeeAnRedirLink({
    originUrl: specialUrl,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA'
  });
  assert.strictEqual(res.cleanLanding, 'https://shopee.vn/Áo-Thun-Nam-(Cao-Cấp)-100%-Cotton-i.123456.789012');
  assert.strictEqual(decodeURIComponent(res.encodedLanding), res.cleanLanding);
  return `Làm sạch và bảo toàn ký tự đặc biệt: ${res.cleanLanding}`;
});

// 15. Kiểm tra URL Encode và Decode (Chống Double Encoding)
runTest(15, 'Kiểm tra URL Encode và Decode (Chống Double Encoding)', () => {
  // Trường hợp URL có slug đã bị trình duyệt percent-encode sẵn
  const browserCopiedUrl = 'https://shopee.vn/%C3%81o-thun-nam-i.123456.789012?utm_source=zalo';
  const res = buildShopeeAnRedirLink({
    originUrl: browserCopiedUrl,
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA-camp1'
  });

  // Đảm bảo không xuất hiện %25C3%2581 (double encoding)
  assert.ok(!res.encodedLanding.includes('%25C3'), 'Không được double encode phần trăm đã encode');
  assert.ok(!res.encodedLanding.includes('%253A'), 'Không được double encode dấu :');
  assert.strictEqual(decodeURIComponent(res.encodedLanding), 'https://shopee.vn/Áo-thun-nam-i.123456.789012');

  // Trường hợp truyền cả URL đã bị encode toàn bộ -> Phải chặn
  let threwPreEncoded = false;
  try {
    buildShopeeAnRedirLink({
      originUrl: encodeURIComponent('https://shopee.vn/product/123456/789012'),
      affiliateId: TEST_AFF_ID
    });
  } catch (err) {
    threwPreEncoded = true;
  }
  assert.ok(threwPreEncoded, 'Phải chặn originUrl đã bị URL encode toàn bộ trước đó');
  return 'Encode đúng 1 lần, Decode trả về chính xác 100% URL gốc, chặn double-encode';
});

// 16. Kiểm tra link đầu ra có đúng endpoint và cấu trúc an_redir hay không
runTest(16, 'Kiểm tra link đầu ra đúng endpoint & cấu trúc an_redir', () => {
  const res = buildShopeeAnRedirLink({
    originUrl: 'https://shopee.vn/product/729014007/17532975547',
    affiliateId: TEST_AFF_ID,
    subParams: 'kolA-summer26--post123-note'
  });

  const expected = 'https://s.shopee.vn/an_redir?origin_link=https%3A%2F%2Fshopee.vn%2Fproduct%2F729014007%2F17532975547&affiliate_id=173401900099&sub_id=kolA-summer26--post123-note';
  assert.strictEqual(res.finalUrl, expected);

  const check = verifyAnRedirOutputUrl(res.finalUrl, 'VN');
  assert.strictEqual(check.valid, true, check.error);
  return `Khớp tuyệt đối: ${res.finalUrl}`;
});

console.log('================================================================================');
console.log('KẾT QUẢ CHẠY BỘ TEST TỰ ĐỘNG SHOPEE AFFILIATE 2026 (16 TEST CASES BẮT BUỘC)');
console.log('================================================================================');
let passed = 0;
for (const r of results) {
  if (r.status === 'PASS') passed++;
  console.log(`[#${String(r.id).padStart(2, '0')}] [${r.status}] ${r.name}`);
  console.log(`      -> ${r.detail}`);
}
console.log('--------------------------------------------------------------------------------');
console.log(`TỔNG KẾT: ${passed}/${results.length} PASS`);
console.log('================================================================================');

if (passed !== results.length) {
  process.exit(1);
}

