import { useAppStore } from '../../store/appStore';
import { Card, CardContent, CardHeader, CardTitle, Button } from '../../components/ui/core';
import {
  Users, Copy, Link2, Send, Gift,
  Percent, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import ReferralDashboardView from '../referral/ReferralDashboardView';

export default function ReferralPage() {
  const { currentUser, settings } = useAppStore();
  const navigate = useNavigate();

  const referralLink = currentUser
    ? `${window.location.origin}/auth?mode=register&ref=${currentUser.id}`
    : `${window.location.origin}/auth?mode=register`;

  const handleCopyLink = () => {
    if (!currentUser) {
      navigate('/auth?mode=register');
      return;
    }
    navigator.clipboard.writeText(referralLink);
    toast.success('Đã sao chép link giới thiệu của bạn!');
  };

  const handleCopyCode = () => {
    if (!currentUser) {
      navigate('/auth?mode=register');
      return;
    }
    navigator.clipboard.writeText(currentUser.id);
    toast.success(`Đã sao chép mã giới thiệu: ${currentUser.id}`);
  };

  return (
    <div className="py-10 md:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* REFERRAL PROMO HERO — NGẮN GỌN, TẬP TRUNG 3 QUYỀN LỢI */}
      <div className="w-full bg-gradient-to-br from-white via-orange-50/40 to-amber-50/50 rounded-3xl p-6 md:p-10 lg:p-12 relative overflow-hidden border border-orange-200/80 shadow-soft">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-200/40 to-amber-100/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-rose-100/40 to-orange-100/30 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
          {/* Left Content: 3 Bullet Benefits, Minimal Text */}
          <div className="max-w-xl text-left flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <Gift className="h-3.5 w-3.5" /> Người mới +30.000đ
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm">
                <Users className="h-3.5 w-3.5" /> Mời 1 bạn +5.000đ
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-extrabold uppercase tracking-wider border border-rose-200">
                <Percent className="h-3.5 w-3.5" /> +20% mỗi đơn
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-5 leading-[1.15] tracking-tight">
              Mời bạn bè nhận{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-red-600">
                +5.000đ & 20%
              </span>{' '}
              mỗi đơn
            </h1>

            {/* Clean, scannable benefit list */}
            <div className="space-y-3 mb-7">
              <div className="flex items-center gap-3 bg-white/90 border border-emerald-200/80 rounded-2xl p-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                  <Gift className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-slate-700">
                  <strong className="text-emerald-600 font-black">Người mới nhận +30.000đ:</strong> Cộng ngay vào ví khi đăng ký tài khoản.
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/90 border border-orange-200/80 rounded-2xl p-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-slate-700">
                  <strong className="text-orange-600 font-black">Mời 1 người +5.000đ:</strong> Vào <em>Chờ duyệt</em>, khi cấp dưới hoàn thành đơn đầu tiên thì tiền thưởng sẽ được cộng vào ví.
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/90 border border-rose-200/80 rounded-2xl p-3.5 shadow-xs">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                  <Percent className="h-5 w-5" />
                </div>
                <div className="text-sm font-medium text-slate-700">
                  <strong className="text-rose-600 font-black">+20% tiền hoàn của bạn bè:</strong> Tính trên tiền hoàn thực nhận của F1 <em>(VD: Bạn bè được hoàn 5k → Bạn nhận 1k)</em>.
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button 
                onClick={handleCopyLink}
                className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95"
              >
                <Copy className="h-5 w-5" /> {currentUser ? 'Sao Chép Link Giới Thiệu' : 'Đăng Ký Nhận 30.000đ Ngay'}
              </Button>
            </div>
          </div>
          
          {/* Right Floating Benefit Cards (3 Cards) */}
          <div className="flex-shrink-0 w-full lg:w-auto grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3.5 relative">
            {/* Card 1: Người mới +30K */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-200 shadow-md flex items-center gap-4 min-w-[260px]">
              <div className="w-13 h-13 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                <Gift className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Quyền lợi người mới</div>
                <div className="text-2xl font-black text-emerald-600">+30.000đ</div>
                <div className="text-[11px] font-semibold text-emerald-700">Tặng ngay khi đăng ký</div>
              </div>
            </div>

            {/* Card 2: Mời 1 bạn +5K */}
            <div className="bg-white p-5 rounded-2xl border-2 border-orange-200 shadow-lg flex items-center gap-4 min-w-[260px]">
              <div className="w-13 h-13 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Thưởng mời 1 bạn</div>
                <div className="text-2xl font-black text-orange-600">+5.000đ</div>
                <div className="text-[11px] font-semibold text-amber-700">Duyệt khi F1 xong đơn đầu</div>
              </div>
            </div>

            {/* Card 3: Hoa hồng +20% tiền hoàn của bạn bè */}
            <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-md flex items-center gap-4 min-w-[260px]">
              <div className="w-13 h-13 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                <Percent className="h-6 w-6" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase">Thưởng theo đơn F1</div>
                <div className="text-2xl font-black text-rose-600">+20%</div>
                <div className="text-[11px] font-semibold text-rose-700">Tính trên tiền hoàn của F1 (F1 hoàn 5k → Bạn +1k)</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* REFERRAL LINK & CODE CARD */}
      <Card className="border-orange-200/80 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between flex-wrap gap-2 text-base">
            <span className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-primary" /> Link & Mã giới thiệu của bạn
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Tự động gắn mã khi bạn bè bấm link
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Link box */}
              <div className="lg:col-span-2 flex items-center justify-between gap-2 border border-border/80 p-2 pl-4 rounded-xl bg-bg overflow-hidden">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-text-secondary uppercase">Link giới thiệu</div>
                  <div className="text-xs font-mono font-semibold text-text truncate">
                    {currentUser 
                      ? referralLink
                      : 'Vui lòng đăng nhập để lấy link giới thiệu...'}
                  </div>
                </div>
                <Button 
                  onClick={handleCopyLink}
                  className="shrink-0 h-9 px-4 rounded-lg font-bold text-xs bg-primary hover:bg-primary/90 text-white border-none flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Sao chép Link
                </Button>
              </div>

              {/* Referral Code box */}
              <div className="flex items-center justify-between gap-2 border border-orange-200 p-2 pl-4 rounded-xl bg-orange-50/40 overflow-hidden">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold text-orange-700 uppercase">Mã giới thiệu</div>
                  <div className="text-sm font-mono font-black text-orange-600 truncate">
                    {currentUser ? currentUser.id : 'Chưa đăng nhập'}
                  </div>
                </div>
                <Button 
                  onClick={handleCopyCode}
                  variant="outline"
                  className="shrink-0 h-9 px-3.5 rounded-lg font-bold text-xs border-orange-300 text-orange-700 hover:bg-orange-100 flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" /> Chép Mã
                </Button>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-border/50">
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-text-secondary">Chia sẻ nhanh:</span>
                <div className="flex items-center gap-2">
                  <a 
                    href={settings?.supportFacebook || 'https://facebook.com/hoantienmuasam'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-blue-600 flex items-center gap-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                    Facebook
                  </a>
                  <a 
                    href={settings?.supportZalo || 'https://zalo.me/g/hoantienmuasam'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded-full bg-sky-500 flex items-center gap-1.5 text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Zalo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DASHBOARD STATS, TABS & TABLES */}
      <ReferralDashboardView onCopyLink={handleCopyLink} />

    </div>
  );
}
