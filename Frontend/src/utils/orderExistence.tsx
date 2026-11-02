import { CheckCircle2, XCircle, Clock } from 'lucide-react';

/**
 * Trích xuất thời điểm tạo đơn từ ID (CLK... / TT...) hoặc chuỗi createdTime
 */
export function parseOrderDate(createdTime?: string, id?: string): Date | null {
  // 1. Ưu tiên trích xuất từ timestamp nhúng trong mã ID (chuẩn miligiây 100%)
  if (id) {
    const match = String(id).match(/(?:CLK|TT)(\d{12,14})/i);
    if (match) {
      const ts = Number(match[1]);
      if (ts > 1000000000000) return new Date(ts);
    }
  }

  // 2. Phân tích chuỗi ngày tháng từ DB (SQLite / MySQL)
  if (createdTime) {
    let clean = String(createdTime).trim();
    if (!clean.endsWith('Z') && !clean.includes('+')) {
      clean = (clean.includes(' ') ? clean.replace(' ', 'T') : clean) + 'Z';
    }
    const d = new Date(clean);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Kiểm tra xem đơn chờ đã quá 1 ngày (24 giờ) chưa
 */
export function isOrderOlderThan1Day(createdTime?: string, id?: string): boolean {
  const orderDate = parseOrderDate(createdTime, id);
  if (!orderDate) return false;
  const diffMs = Date.now() - orderDate.getTime();
  return diffMs > 24 * 60 * 60 * 1000;
}

interface OrderExistenceBadgeProps {
  status?: string;
  createdTime?: string;
  id?: string;
  size?: 'sm' | 'md';
}

/**
 * Component hiển thị trạng thái tồn tại của đơn hàng:
 * - Đã duyệt / Đã thanh toán (approved / paid) -> "Tồn tại" (Xanh lá)
 * - Đơn bị hủy / từ chối (rejected) -> "Không" (Đỏ)
 * - Đơn đang chờ (pending):
 *   + Trong ngày hôm đó (<= 24 giờ): "Chờ đối soát" (Vàng / Cam)
 *   + Trên 1 ngày (> 24 giờ mà chưa khớp sàn): "Không" (Đỏ)
 */
export function OrderExistenceBadge({
  status,
  createdTime,
  id,
  size = 'md'
}: OrderExistenceBadgeProps) {
  const isApproved = status === 'approved' || status === 'paid';
  const isRejected = status === 'rejected';

  // 1. Còn lại thì tồn tại (đã đối soát thành công)
  if (isApproved) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs rounded-md ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <CheckCircle2 className={size === 'sm' ? 'w-3 h-3 text-emerald-600' : 'w-3.5 h-3.5 text-emerald-600'} /> Tồn tại
      </span>
    );
  }

  // 2. Nếu đơn bị từ chối
  if (isRejected) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold bg-rose-50 text-rose-600 border border-rose-200 shadow-xs rounded-md ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <XCircle className={size === 'sm' ? 'w-3 h-3 text-rose-500' : 'w-3.5 h-3.5 text-rose-500'} /> Không
      </span>
    );
  }

  // 3. Đơn đang chờ đối soát:
  // Trên 1 ngày thì mới là Không, trong ngày hôm đó thì là Chờ đối soát
  const isOlder = isOrderOlderThan1Day(createdTime, id);

  if (isOlder) {
    return (
      <span
        className={`inline-flex items-center gap-1 font-bold bg-rose-50 text-rose-600 border border-rose-200 shadow-xs rounded-md ${
          size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <XCircle className={size === 'sm' ? 'w-3 h-3 text-rose-500' : 'w-3.5 h-3.5 text-rose-500'} /> Không
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold bg-amber-50 text-amber-600 border border-amber-200 shadow-xs rounded-md ${
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <Clock className={size === 'sm' ? 'w-3 h-3 text-amber-500' : 'w-3.5 h-3.5 text-amber-500'} /> Chờ đối soát
    </span>
  );
}

export default OrderExistenceBadge;
