import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Wallet, TrendingUp,
  Gift, Sparkles, ChevronRight,
  Clock, RotateCw
} from 'lucide-react';
import { Button, Card } from '../../components/ui/core';
import { useAppStore } from '../../store/appStore';
import { formatVietnamDateTime } from '../../utils/dateTime';
import { toast } from 'sonner';

export type NotificationCategory = 'all' | 'credit' | 'withdraw' | 'promo' | 'system';

interface DisplayNotification {
  id: string;
  title: string;
  content: string;
  time: string;
  read: boolean;
  category: 'credit' | 'withdraw' | 'promo' | 'system';
  amount?: number;
  actionUrl?: string;
  actionLabel?: string;
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'danger' | 'info';
  };
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const {
    currentUser,
    notifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    openAuthModal,
    orders,
    withdrawals
  } = useAppStore();

  const [activeCategory, setActiveCategory] = useState<NotificationCategory>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('local_read_notif_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setTimeout(() => {
      setIsRefreshing(false);
      toast.success('Đã cập nhật danh sách thông báo mới nhất');
    }, 400);
  };

  const handleMarkAsRead = (id: string) => {
    setReadIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem('local_read_notif_ids', JSON.stringify(Array.from(next)));
      return next;
    });
    markNotificationAsRead(id);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    const allIds = displayList.map(n => n.id);
    const updated = new Set([...Array.from(readIds), ...allIds]);
    setReadIds(updated);
    localStorage.setItem('local_read_notif_ids', JSON.stringify(Array.from(updated)));
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc');
  };

  // Tổng hợp danh sách thông báo từ API backend kết hợp cùng lịch sử giao dịch thực tế của user
  const displayList = useMemo<DisplayNotification[]>(() => {
    if (!currentUser) return [];

    const map = new Map<string, DisplayNotification>();

    // 1. Quà chào mừng thành viên mới (+30.000đ)
    if (currentUser.role !== 'admin') {
      const signupId = `notif-welcome-${currentUser.id}`;
      map.set(signupId, {
        id: signupId,
        title: 'Tặng 30.000đ quà chào mừng thành viên mới!',
        content: 'Chúc mừng bạn đã gia nhập nền tảng. Tiền thưởng 30.000đ đã được cộng thẳng vào số dư ví của bạn. Đủ 50.000đ có thể rút về ngân hàng.',
        time: (currentUser as any).createdAt || new Date().toISOString(),
        read: readIds.has(signupId),
        category: 'promo',
        amount: 30000,
        actionUrl: '/wallet',
        actionLabel: 'Kiểm tra ví',
        statusBadge: { text: '+30.000đ', variant: 'success' }
      });
    }

    // 2. Thông báo từ API backend trong DB
    notifications.forEach(n => {
      let category: DisplayNotification['category'] = 'system';
      let statusBadge: DisplayNotification['statusBadge'] | undefined;
      let actionUrl: string | undefined;
      let actionLabel: string | undefined;

      if (n.type === 'wallet' || /rút tiền|ngân hàng/i.test(n.title + n.content)) {
        category = 'withdraw';
        actionUrl = '/wallet';
        actionLabel = 'Xem chi tiết ví';
        if (/thành công|đã duyệt|giải ngân/i.test(n.title + n.content)) {
          statusBadge = { text: 'Thành công', variant: 'success' };
        } else if (/từ chối|hủy/i.test(n.title + n.content)) {
          statusBadge = { text: 'Từ chối', variant: 'danger' };
        } else {
          statusBadge = { text: 'Đang xử lý', variant: 'warning' };
        }
      } else if (n.type === 'order' || /hoàn tiền|cộng tiền|đơn hàng/i.test(n.title + n.content)) {
        category = 'credit';
        actionUrl = '/tracking';
        actionLabel = 'Xem đơn hàng';
        statusBadge = { text: 'Đã cộng ví', variant: 'success' };
      } else if (/thưởng|quà|khuyến mãi|hoa hồng/i.test(n.title + n.content)) {
        category = 'promo';
        actionUrl = '/wallet';
        actionLabel = 'Xem ví';
        statusBadge = { text: 'Thưởng', variant: 'info' };
      }

      map.set(n.id, {
        id: n.id,
        title: n.title,
        content: n.content,
        time: n.time,
        read: n.read || readIds.has(n.id),
        category,
        actionUrl,
        actionLabel,
        statusBadge
      });
    });

    // 3. Thông báo từ Lịch sử rút tiền của User (Đảm bảo người dùng luôn thấy lệnh rút)
    withdrawals
      .filter(w => w.userId === currentUser.id)
      .forEach(w => {
        const notifId = `notif-wd-${w.id}`;
        let title = 'Yêu cầu rút tiền đang chờ xử lý';
        let content = `Bạn đã tạo yêu cầu rút ${w.amount.toLocaleString('vi-VN')}đ về ${w.bankName} (${w.accountNumber}). Ban quản trị đang tiến hành duyệt giải ngân.`;
        let statusBadge: DisplayNotification['statusBadge'] = { text: 'Chờ duyệt', variant: 'warning' };

        if (w.status === 'approved') {
          title = 'Rút tiền về tài khoản thành công!';
          content = `Yêu cầu rút ${w.amount.toLocaleString('vi-VN')}đ đã được chuyển khoản thành công vào số tài khoản ${w.accountNumber} (${w.bankName}).`;
          statusBadge = { text: 'Đã giải ngân', variant: 'success' };
        } else if (w.status === 'rejected') {
          title = 'Yêu cầu rút tiền bị từ chối';
          content = `Lệnh rút ${w.amount.toLocaleString('vi-VN')}đ của bạn không được phê duyệt: ${w.notes || 'Vui lòng kiểm tra lại thông tin ngân hàng'}. Tiền đã hoàn lại số dư.`;
          statusBadge = { text: 'Bị từ chối', variant: 'danger' };
        }

        map.set(notifId, {
          id: notifId,
          title,
          content,
          time: w.requestDate,
          read: readIds.has(notifId),
          category: 'withdraw',
          amount: w.amount,
          actionUrl: '/wallet',
          actionLabel: 'Chi tiết ví',
          statusBadge
        });
      });

    // 4. Thông báo từ các đơn hàng Shopee / TikTok đã được duyệt (+tiền hoàn)
    orders
      .filter(o => o.userId === currentUser.id && (o.status === 'approved' || o.status === 'paid'))
      .forEach(o => {
        const cashbackAmount = o.realCashback || o.estimatedCashback || 0;
        if (cashbackAmount > 0) {
          const notifId = `notif-cashback-ord-${o.id}`;
          const isTikTok = (o as any).platform === 'tiktok' || String(o.id).startsWith('TT');
          const platformName = isTikTok ? 'TikTok Shop' : 'Shopee';

          map.set(notifId, {
            id: notifId,
            title: `Cộng +${cashbackAmount.toLocaleString('vi-VN')}đ hoàn tiền đơn ${platformName}!`,
            content: `Đơn hàng ${platformName} mã #${o.id} của bạn đã hoàn thành đối soát. Số tiền hoàn ${cashbackAmount.toLocaleString('vi-VN')}đ đã được cộng vào số dư ví.`,
            time: o.createdTime || new Date().toISOString(),
            read: readIds.has(notifId),
            category: 'credit',
            amount: cashbackAmount,
            actionUrl: '/wallet',
            actionLabel: 'Vào ví kiểm tra',
            statusBadge: { text: `+${cashbackAmount.toLocaleString('vi-VN')}đ`, variant: 'success' }
          });
        }
      });

    // Sắp xếp thông báo mới nhất lên đầu
    return Array.from(map.values()).sort((a, b) => {
      const timeA = new Date(a.time).getTime() || 0;
      const timeB = new Date(b.time).getTime() || 0;
      return timeB - timeA;
    });
  }, [currentUser, notifications, orders, withdrawals, readIds]);

  // Bộ lọc theo phân loại
  const filteredList = useMemo(() => {
    if (activeCategory === 'all') return displayList;
    return displayList.filter(item => item.category === activeCategory);
  }, [displayList, activeCategory]);

  const unreadCount = useMemo(() => {
    return displayList.filter(n => !n.read).length;
  }, [displayList]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 min-h-[70vh]">
      {/* 1. HEADER TRANG THÔNG BÁO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-6 border-b border-border/80">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#EE4D2D] to-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/25 shrink-0">
            <Bell className="w-6 h-6 stroke-[2.3]" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Thông Báo & Biến Động
              </h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EE4D2D] text-white shadow-xs">
                  {unreadCount} mới
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cập nhật tức thời tiền hoàn, yêu cầu rút tiền và tin tức hệ thống
            </p>
          </div>
        </div>

        {/* Nút tiện ích */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            title="Làm mới"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#EE4D2D]' : ''}`} />
            <span>Làm mới</span>
          </button>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#EE4D2D] bg-orange-50 border border-orange-200 hover:bg-orange-100 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <CheckCheck className="w-4 h-4 stroke-[2.2]" />
              <span>Đã đọc tất cả</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. BỘ LỌC TABS / CATEGORY PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 no-scrollbar">
        {[
          { id: 'all', label: 'Tất cả', count: displayList.length },
          {
            id: 'credit',
            label: 'Cộng tiền hoàn',
            count: displayList.filter(n => n.category === 'credit').length
          },
          {
            id: 'withdraw',
            label: 'Rút tiền',
            count: displayList.filter(n => n.category === 'withdraw').length
          },
          {
            id: 'promo',
            label: 'Thưởng & Tân thủ',
            count: displayList.filter(n => n.category === 'promo').length
          },
          {
            id: 'system',
            label: 'Hệ thống',
            count: displayList.filter(n => n.category === 'system').length
          }
        ].map(tab => {
          const isActive = activeCategory === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id as NotificationCategory)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-[#EE4D2D] text-white shadow-sm shadow-orange-500/25'
                  : 'bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. TRƯỜNG HỢP CHƯA ĐĂNG NHẬP */}
      {!currentUser && (
        <Card className="p-8 text-center bg-gradient-to-b from-orange-50/50 to-white border-dashed border-2 border-orange-200 rounded-3xl mb-8">
          <div className="w-14 h-14 rounded-2xl bg-orange-100 text-[#EE4D2D] flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Bell className="w-7 h-7 stroke-[2.2]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
            Đăng nhập để xem biến động số dư của bạn
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mb-5 leading-relaxed">
            Mọi thông báo cộng tiền đơn hàng Shopee, TikTok Shop và tiến độ duyệt rút tiền về ngân hàng sẽ hiển thị đầy đủ tại đây.
          </p>
          <Button
            onClick={() => openAuthModal('login')}
            className="px-6 py-2.5 font-bold bg-[#EE4D2D] hover:bg-[#d03d2b] text-white rounded-xl shadow-md shadow-orange-500/20"
          >
            Đăng nhập ngay
          </Button>
        </Card>
      )}

      {/* 4. DANH SÁCH THÔNG BÁO */}
      {currentUser && (
        <div className="flex flex-col gap-3">
          {filteredList.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200/70 rounded-3xl p-8">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h4 className="font-bold text-sm text-slate-800 mb-1">
                Không có thông báo nào trong mục này
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Khi có biến động tiền hoàn, thanh toán hoặc quà tặng, thông báo sẽ hiển thị tại đây.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
                className="text-xs font-bold border-slate-200 text-slate-700 rounded-xl"
              >
                Mua sắm tích tiền hoàn ngay
              </Button>
            </div>
          ) : (
            filteredList.map(item => {
              const isUnread = !item.read;

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    handleMarkAsRead(item.id);
                    if (item.actionUrl) {
                      navigate(item.actionUrl);
                    }
                  }}
                  className={`group relative p-4 sm:p-5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                    isUnread
                      ? 'bg-orange-50/40 border-orange-200/90 shadow-xs hover:border-[#EE4D2D]'
                      : 'bg-white border-slate-200/70 hover:border-slate-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3.5 sm:gap-4">
                    {/* Icon phân loại */}
                    <div className="shrink-0 mt-0.5">
                      {item.category === 'credit' && (
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-xs">
                          <TrendingUp className="w-5 h-5 stroke-[2.3]" />
                        </div>
                      )}
                      {item.category === 'withdraw' && (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs">
                          <Wallet className="w-5 h-5 stroke-[2.3]" />
                        </div>
                      )}
                      {item.category === 'promo' && (
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center shadow-xs">
                          <Gift className="w-5 h-5 stroke-[2.3]" />
                        </div>
                      )}
                      {item.category === 'system' && (
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-xs">
                          <Sparkles className="w-5 h-5 stroke-[2.3]" />
                        </div>
                      )}
                    </div>

                    {/* Nội dung thông báo */}
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-sm ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-800'}`}>
                            {item.title}
                          </h3>
                          {isUnread && (
                            <span className="w-2 h-2 rounded-full bg-[#EE4D2D] shrink-0" />
                          )}
                        </div>

                        {item.statusBadge && (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${
                              item.statusBadge.variant === 'success'
                                ? 'bg-emerald-100 text-emerald-700'
                                : item.statusBadge.variant === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : item.statusBadge.variant === 'danger'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {item.statusBadge.text}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed mb-2.5">
                        {item.content}
                      </p>

                      <div className="flex items-center justify-between gap-3 text-[11px] text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatVietnamDateTime(item.time)}</span>
                        </div>

                        {item.actionLabel && (
                          <span className="font-bold text-[#EE4D2D] group-hover:translate-x-1 transition-transform inline-flex items-center gap-0.5 text-xs">
                            {item.actionLabel}
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
