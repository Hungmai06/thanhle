/**
 * Tiện ích format ngày giờ chuẩn Việt Nam (Múi giờ Hà Nội - GMT+7)
 * Định dạng chuẩn: DD/MM/YYYY HH:mm:ss
 */

function formatParts(d: Date): string {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  const parts = formatter.formatToParts(d);
  const map: Record<string, string> = {};
  parts.forEach(p => { map[p.type] = p.value; });
  return `${map.day}/${map.month}/${map.year} ${map.hour}:${map.minute}:${map.second}`;
}

/**
 * Format ngày giờ đầy đủ: DD/MM/YYYY HH:mm:ss theo múi giờ Hà Nội
 * Hỗ trợ mọi định dạng:
 * - SQL string: "YYYY-MM-DD HH:mm:ss"
 * - ISO string: "YYYY-MM-DDTHH:mm:ss.sssZ", "YYYY-MM-DDTHH:mm:ss+07:00"
 * - Unix timestamp (seconds hoặc milliseconds)
 * - Date object
 * - Chuỗi ngày Việt Nam: "DD/MM/YYYY HH:mm:ss"
 */
export function formatVietnamDateTime(raw?: string | number | Date | null): string {
  if (!raw) return '-';

  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return '-';
    return formatParts(raw);
  }

  if (typeof raw === 'number') {
    const d = new Date(raw < 1e11 ? raw * 1000 : raw);
    return isNaN(d.getTime()) ? '-' : formatParts(d);
  }

  const s = String(raw).trim();
  if (!s) return '-';

  // 1. Nếu là chuỗi số timestamp
  if (/^\d{9,13}$/.test(s)) {
    const num = Number(s);
    const d = new Date(num < 1e11 ? num * 1000 : num);
    return isNaN(d.getTime()) ? '-' : formatParts(d);
  }

  // 2. Nếu đã ở định dạng DD/MM/YYYY hoặc DD-MM-YYYY
  const vnMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (vnMatch) {
    const day = String(vnMatch[1]).padStart(2, '0');
    const month = String(vnMatch[2]).padStart(2, '0');
    const year = vnMatch[3];
    const hour = vnMatch[4] ? String(vnMatch[4]).padStart(2, '0') : '00';
    const minute = vnMatch[5] ? String(vnMatch[5]).padStart(2, '0') : '00';
    const second = vnMatch[6] ? String(vnMatch[6]).padStart(2, '0') : '00';
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }

  // 3. Nếu là chuỗi ISO có timezone (chứa 'Z' hoặc '+')
  if (s.includes('Z') || s.includes('+')) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s : formatParts(d);
  }

  // 4. Chuỗi chuẩn SQL YYYY-MM-DD HH:mm:ss (đã lưu theo múi giờ Hà Nội)
  const sqlMatch = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})(?:[\sT](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/);
  if (sqlMatch) {
    const year = sqlMatch[1];
    const month = String(sqlMatch[2]).padStart(2, '0');
    const day = String(sqlMatch[3]).padStart(2, '0');
    const hour = sqlMatch[4] ? String(sqlMatch[4]).padStart(2, '0') : '00';
    const minute = sqlMatch[5] ? String(sqlMatch[5]).padStart(2, '0') : '00';
    const second = sqlMatch[6] ? String(sqlMatch[6]).padStart(2, '0') : '00';
    return `${day}/${month}/${year} ${hour}:${minute}:${second}`;
  }

  // 5. Fallback Date parse
  const d = new Date(s);
  return isNaN(d.getTime()) ? s : formatParts(d);
}

/**
 * Format ngày: DD/MM/YYYY theo múi giờ Hà Nội
 */
export function formatVietnamDate(raw?: string | number | Date | null): string {
  const dt = formatVietnamDateTime(raw);
  if (dt === '-') return '-';
  const parts = dt.split(' ');
  return parts[0] || dt;
}

/**
 * Format giờ: HH:mm:ss theo múi giờ Hà Nội
 */
export function formatVietnamTime(raw?: string | number | Date | null): string {
  const dt = formatVietnamDateTime(raw);
  if (dt === '-') return '-';
  const parts = dt.split(' ');
  return parts[1] || dt;
}

