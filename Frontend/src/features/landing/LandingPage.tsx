import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, CheckCircle2, ShieldCheck, Zap, LineChart,
  ArrowRight, Copy, Heart, Share2,
  MessageSquare, Star, ShoppingBag, Sparkles, AlertCircle, Wallet,
  Store, Activity, ShoppingCart, Link2, Clock, ShieldAlert, RefreshCw, Users,
  Clipboard, Play, X
} from 'lucide-react';
import { Button, Card, CardContent, Badge, Accordion, AccordionItem } from '../../components/ui/core';
import { useAppStore } from '../../store/appStore';
import type { Order } from '../../store/appStore';
import { toast } from 'sonner';

// Custom Shopee Brand Icon
function ShopeeBrandIcon({ className = "w-5 h-5", inverted = false }: { className?: string; inverted?: boolean }) {
  if (inverted) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M6 3L3 7V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V7L18 3H6Z"
          fill="white"
        />
        <path d="M3 7H21" stroke="#EE4D2D" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M16 10C16 12.2091 14.2091 14 12 14C9.79086 14 8 12.2091 8 10"
          stroke="#EE4D2D"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M13.5 16.5C13.5 17.3 12.8 18 12 18C11.2 18 10.5 17.3 10.5 16.5"
          stroke="#FFB000"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 3L3 7V20C3 20.5304 3.21071 21.0391 3.58579 21.4142C3.96086 21.7893 4.46957 22 5 22H19C19.5304 22 20.0391 21.7893 20.4142 21.4142C20.7893 21.0391 21 20.5304 21 20V7L18 3H6Z"
        fill="#EE4D2D"
      />
      <path d="M3 7H21" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M16 10C16 12.2091 14.2091 14 12 14C9.79086 14 8 12.2091 8 10"
        stroke="white"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13.5 16.5C13.5 17.3 12.8 18 12 18C11.2 18 10.5 17.3 10.5 16.5"
        stroke="#FFB000"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Custom TikTok Brand Icon
function TikTokBrandIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg className="w-full h-full drop-shadow-xs" viewBox="0 0 24 24" fill="currentColor">
        <path
          d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"
        />
      </svg>
      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00F2FE] border border-white" />
    </div>
  );
}

const getYouTubeEmbedUrl = (rawUrl?: string): string | null => {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // youtube.com/shorts/ID
  const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${shortsMatch[1]}?autoplay=1&rel=0`;
  }

  // youtu.be/ID
  const youtuBeMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
  if (youtuBeMatch && youtuBeMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${youtuBeMatch[1]}?autoplay=1&rel=0`;
  }

  // youtube.com/watch?v=ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]+)/i);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${watchMatch[1]}?autoplay=1&rel=0`;
  }

  // youtube.com/embed/ID
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i);
  if (embedMatch && embedMatch[1]) {
    return `https://www.youtube-nocookie.com/embed/${embedMatch[1]}?autoplay=1&rel=0`;
  }

  return null;
};

const isShortsUrl = (rawUrl?: string): boolean => {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  return /youtube\.com\/shorts\//i.test(rawUrl);
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, addOrder, toggleFavorite, favorites, openAuthModal, settings } = useAppStore();

  // Platform selection state: 'shopee' | 'tiktok'
  const initialPlatform = searchParams.get('platform') === 'tiktok' ? 'tiktok' : 'shopee';
  const [activePlatform, setActivePlatform] = useState<'shopee' | 'tiktok'>(initialPlatform);

  // Unified search state (Shopee & TikTok)
  const [unifiedLink, setUnifiedLink] = useState('');

  // Shopee states
  const [shopeeLink, setShopeeLink] = useState('');
  const [checkedProduct, setCheckedProduct] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // TikTok states
  const [tiktokLink, setTiktokLink] = useState('');
  const [checkedTikTokProduct, setCheckedTikTokProduct] = useState<any>(null);
  const [isTikTokSearching, setIsTikTokSearching] = useState(false);

  // Video & Notes Modal States
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [videoModalPlatform, setVideoModalPlatform] = useState<'shopee' | 'tiktok'>('shopee');

  const fetchShopeeProduct = async (linkInput: string) => {
    const rawInput = linkInput.trim();
    if (!rawInput) {
      toast.error('Vui lòng nhập link hoặc ID sản phẩm Shopee');
      return;
    }

    const isItemId = /^\d+$/.test(rawInput);
    const isShopeeUrl = rawInput.includes('shopee.vn') ||
                        rawInput.includes('shp.ee') ||
                        rawInput.includes('s.shopee.vn');

    const isTikTokUrl = rawInput.includes('tiktok.com') ||
                        rawInput.includes('vt.tiktok.com') ||
                        rawInput.includes('shop.tiktok.com') ||
                        rawInput.includes('snssdk.com');

    if (isTikTokUrl) {
      setActivePlatform('tiktok');
      setTiktokLink(rawInput);
      setUnifiedLink(rawInput);
      fetchTikTokProduct(rawInput);
      return;
    }

    if (!isItemId && !isShopeeUrl) {
      toast.error('Link không hợp lệ! Vui lòng nhập link sản phẩm Shopee hoặc TikTok Shop.');
      setCheckedProduct(null);
      return;
    }

    setIsSearching(true);
    setCheckedProduct(null);

    try {
      const queryParam = isItemId ? `item_id=${encodeURIComponent(rawInput)}` : `url=${encodeURIComponent(rawInput)}`;
      const API_BASE = import.meta.env.VITE_API_BASE || '/api';

      let data: any = null;

      // 1. Ưu tiên gọi qua Backend API server (Bảo mật API Key & tránh CORS)
      try {
        const response = await fetch(`${API_BASE}/shopee/product-info?${queryParam}`);
        if (response.ok) {
          data = await response.json();
        }
      } catch (beErr) {
        console.warn('Backend proxy fetch failed:', beErr);
      }

      // 2. Nếu Backend chưa cấu hình key và có key ở client settings, fallback gọi trực tiếp với key
      if ((!data || data.code === 'MISSING_API_KEY') && settings?.addlivetagApiKey) {
        try {
          const directUrl = `https://data.addlivetag.com/product-data/product-data.php?${queryParam}&key=${encodeURIComponent(settings.addlivetagApiKey.trim())}`;
          const directRes = await fetch(directUrl, {
            headers: { 'X-API-Key': settings.addlivetagApiKey.trim() }
          });
          if (directRes.ok) {
            data = await directRes.json();
          }
        } catch (dErr) {
          console.warn('Direct fetch failed:', dErr);
        }
      }

      if (data && data.status === 'success' && data.productInfo) {
        const info = data.productInfo;
        const validProductUrl = (info.productLink && !info.productLink.includes('-/-'))
          ? info.productLink
          : (rawInput.startsWith('http')
              ? rawInput
              : `https://shopee.vn/product/${info.shopId || '0'}/${info.itemId}`);

        const rawComm = Math.max(
          Number(info.commission) || 0,
          (Number(info.sellerComFinal) || 0) + (Number(info.shopeeComFinal) || 0)
        );
        const estCashback = Math.floor(rawComm * 0.5);

        const productObj: any = {
          itemId: info.itemId,
          name: info.productName || 'Sản phẩm Shopee',
          shopName: info.shopName || 'Shopee Shop',
          price: Math.floor(Number(info.price) || 0),
          sales: info.sales || 0,
          image: info.imageUrl
            ? (info.imageUrl.startsWith('http') ? info.imageUrl : `https://cf.shopee.vn/file/${info.imageUrl}`)
            : '',
          url: validProductUrl,
          rating: info.rating || '5.0',
          commission: rawComm,
          estimatedCashback: estCashback, // Chính xác 50% hoa hồng do API trả ra
          sellerComFinal: Math.floor(Number(info.sellerComFinal) || 0),
          shopeeComFinal: Math.floor(Number(info.shopeeComFinal) || 0),
          isXtra: !!info.isXtra,
          lastUpdate: info.lastUpdate || new Date().toLocaleString('vi-VN'),
          dataSource: info.dataSource || 'api',
          priceStats: info.priceStats || null,
          cashbackRate: info.price > 0 ? (estCashback / info.price) : 0.035
        };

        setCheckedProduct(productObj);
        try {
          sessionStorage.setItem('checked_shopee_product', JSON.stringify(productObj));
          sessionStorage.setItem('checked_shopee_input', rawInput);
        } catch {}
      } else {
        setCheckedProduct(null);
        try {
          sessionStorage.removeItem('checked_shopee_product');
          sessionStorage.removeItem('checked_shopee_input');
        } catch {}

        if (data?.code === 'MISSING_API_KEY' || data?.apiKeyNotice?.status === 'missing') {
          toast.error('Hệ thống chưa cài đặt API Key AddLiveTag. Vui lòng vào Cài đặt Quản trị viên để nhập API Key.');
        } else if (data?.message) {
          toast.error(`Sản phẩm không tồn tại hoặc link Shopee không đúng! (${data.message})`);
        } else {
          toast.error('Sản phẩm không tồn tại hoặc link Shopee không đúng! Vui lòng kiểm tra lại link.');
        }
      }
    } catch (error: any) {
      console.warn('Error fetching Shopee product:', error);
      setCheckedProduct(null);
      try {
        sessionStorage.removeItem('checked_shopee_product');
        sessionStorage.removeItem('checked_shopee_input');
      } catch {}
      toast.error('Không tìm thấy sản phẩm hoặc link không tồn tại. Vui lòng kiểm tra lại link Shopee!');
    } finally {
      setIsSearching(false);
    }
  };

  const handleUnifiedSearch = async (linkParam?: string) => {
    const rawInput = (linkParam !== undefined ? linkParam : (unifiedLink || shopeeLink || tiktokLink)).trim();
    if (!rawInput) {
      toast.error('Vui lòng nhập link sản phẩm Shopee hoặc TikTok Shop');
      return;
    }

    const isTikTokUrl = rawInput.includes('tiktok.com') ||
                        rawInput.includes('vt.tiktok.com') ||
                        rawInput.includes('shop.tiktok.com') ||
                        rawInput.includes('snssdk.com');

    if (isTikTokUrl) {
      setActivePlatform('tiktok');
      setTiktokLink(rawInput);
      setUnifiedLink(rawInput);
      setCheckedProduct(null);
      await fetchTikTokProduct(rawInput);
    } else {
      setActivePlatform('shopee');
      setShopeeLink(rawInput);
      setUnifiedLink(rawInput);
      setCheckedTikTokProduct(null);
      await fetchShopeeProduct(rawInput);
    }
  };

  const handlePasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        const clean = text.trim();
        setUnifiedLink(clean);
        toast.success('Đã dán link từ bộ nhớ tạm!');
        await handleUnifiedSearch(clean);
      } else {
        toast.info('Bộ nhớ tạm đang trống. Hãy sao chép link Shopee hoặc TikTok trước.');
      }
    } catch {
      toast.info('Vui lòng dán trực tiếp link vào ô tìm kiếm (Ctrl + V)');
    }
  };

  // Khôi phục sản phẩm tra cứu trên màn hình khi load trang
  useEffect(() => {
    try {
      const savedProd = sessionStorage.getItem('checked_shopee_product');
      const savedInput = sessionStorage.getItem('checked_shopee_input');
      if (savedProd) {
        setCheckedProduct((prev: any) => prev || JSON.parse(savedProd));
      }
      if (savedInput) {
        setShopeeLink((prev) => prev || savedInput);
      }

      const savedTikTokProd = sessionStorage.getItem('checked_tiktok_product');
      const savedTikTokInput = sessionStorage.getItem('checked_tiktok_input');
      if (savedTikTokProd) {
        setCheckedTikTokProduct((prev: any) => prev || JSON.parse(savedTikTokProd));
      }
      if (savedTikTokInput) {
        setTiktokLink((prev) => prev || savedTikTokInput);
      }
    } catch {}
  }, []);

  // Sau khi đăng nhập thành công: Giữ nguyên sản phẩm đã tra cứu trên màn hình để thực hiện bước tiếp theo
  useEffect(() => {
    if (currentUser) {
      try {
        const savedProd = sessionStorage.getItem('checked_shopee_product');
        const savedInput = sessionStorage.getItem('checked_shopee_input');
        if (savedProd) {
          setCheckedProduct((prev: any) => prev || JSON.parse(savedProd));
        }
        if (savedInput) {
          setShopeeLink((prev) => prev || savedInput);
        }

        const autoNext = sessionStorage.getItem('pending_auto_next_step');
        if (autoNext === 'true') {
          sessionStorage.removeItem('pending_auto_next_step');
          setTimeout(() => {
            const btn = document.getElementById('btn-buy-now-cashback');
            if (btn) {
              btn.click();
            }
          }, 350);
        }

        const autoNextTikTok = sessionStorage.getItem('pending_auto_next_tiktok');
        if (autoNextTikTok === 'true') {
          sessionStorage.removeItem('pending_auto_next_tiktok');
          setTimeout(() => {
            const btn = document.getElementById('btn-buy-now-tiktok');
            if (btn) {
              btn.click();
            }
          }, 350);
        }
      } catch {}
    }
  }, [currentUser]);

  // Tra cứu sản phẩm TikTok Shop
  const fetchTikTokProduct = async (linkInput: string) => {
    if (!linkInput) return;

    setIsTikTokSearching(true);
    setCheckedTikTokProduct(null);

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '/api';
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
      const userId = currentUser ? currentUser.id : '';

      const res = await fetch(`${API_BASE}/tiktok/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          url: linkInput,
          userId: userId
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.affiliateLink) {
        const prod = data.productInfo || {
          name: 'Sản phẩm TikTok Shop (Đã gắn mã hoàn tiền)',
          price: 0,
          commissionRate: 10,
          estimatedCashback: 0,
          shopName: 'TikTok Shop Official'
        };

        const rawComm = Math.floor(Number(prod.commissionAmount || prod.estimatedCommission) || 0);
        const estCashback = (prod.estimatedCashback !== undefined && prod.estimatedCashback !== null && prod.estimatedCashback > 0)
          ? Math.floor(Number(prod.estimatedCashback))
          : (rawComm > 0
              ? Math.floor(rawComm * 0.5)
              : (prod.price > 0 && prod.commissionRate > 0
                  ? Math.floor(prod.price * (prod.commissionRate / 100) * 0.5)
                  : 0));
        const userCashbackRate = Number(((prod.userCashbackRate || (prod.commissionRate || 10) * 0.5)).toFixed(1));

        const finalProductObj = {
          ...prod,
          estimatedCashback: estCashback, // Chính xác 50% hoa hồng API
          userCashbackRate,
          affiliateLink: data.affiliateLink,
          subId: data.subId,
          productId: data.productId,
          mode: data.mode,
          originUrl: linkInput,
          clickId: data.clickId
        };

        setCheckedTikTokProduct(finalProductObj);
        try {
          sessionStorage.setItem('checked_tiktok_product', JSON.stringify(finalProductObj));
          sessionStorage.setItem('checked_tiktok_input', linkInput);
        } catch {}
      } else {
        toast.error(data.message || 'Không thể lấy thông tin tiền hoàn TikTok. Vui lòng kiểm tra lại link!');
      }
    } catch (err: any) {
      console.warn('Lỗi khi tra cứu link TikTok:', err);
      toast.error('Lỗi kết nối khi tra cứu link TikTok. Vui lòng thử lại!');
    } finally {
      setIsTikTokSearching(false);
    }
  };

  const handleOpenTikTokAffiliateLink = () => {
    if (!checkedTikTokProduct || !checkedTikTokProduct.affiliateLink) return;

    if (!currentUser) {
      try {
        sessionStorage.setItem('checked_tiktok_product', JSON.stringify(checkedTikTokProduct));
        sessionStorage.setItem('checked_tiktok_input', tiktokLink);
        sessionStorage.setItem('pending_auto_next_tiktok', 'true');
      } catch {}

      toast.info('Vui lòng đăng nhập để hệ thống ghi nhận hoa hồng TikTok vào ví của bạn');
      openAuthModal('login');
      return;
    }

    try {
      const newOrder: any = {
        id: checkedTikTokProduct.clickId || `TT${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
        productName: checkedTikTokProduct.name || 'Sản phẩm TikTok Shop',
        productImage: checkedTikTokProduct.image || '',
        orderAmount: Math.floor(checkedTikTokProduct.price || 0),
        estimatedCashback: Math.floor(checkedTikTokProduct.estimatedCashback || 0),
        status: 'pending',
        createdTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
        userId: currentUser.id,
        productUrl: checkedTikTokProduct.originUrl || tiktokLink,
        platform: 'tiktok'
      };
      addOrder(newOrder);
    } catch {}

    window.open(checkedTikTokProduct.affiliateLink, '_blank', 'noopener,noreferrer');
  };

  const handleCreateAffiliateLink = async () => {
    if (!checkedProduct) return;

    if (!currentUser) {
      // Lưu lại thông tin sản phẩm đã tra cứu và đánh dấu để mở tiếp sau khi đăng nhập
      try {
        sessionStorage.setItem('checked_shopee_product', JSON.stringify(checkedProduct));
        sessionStorage.setItem('checked_shopee_input', shopeeLink);
        sessionStorage.setItem('pending_auto_next_step', 'true');
      } catch {}

      openAuthModal('login');
      return;
    }

    const openUrl = (targetUrl: string) => {
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|FBAN|FBAV|Instagram|Zalo/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (isMobileDevice) {
        window.location.href = targetUrl;
      } else {
        const win = window.open(targetUrl, '_blank');
        if (!win || win.closed || typeof win.closed === 'undefined') {
          window.location.href = targetUrl;
        }
      }
    };

    try {
      const API_BASE = import.meta.env.VITE_API_BASE || '/api';
      const token = localStorage.getItem('token') || localStorage.getItem('access_token') || '';
      const userId = currentUser.id || '';

      const res = await fetch(`${API_BASE}/shopee/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          url: checkedProduct.url,
          userId: userId,
          user_id: userId,
          sub_id1: userId,
          sub_id: userId
        })
      });
      const data = await res.json();

      if (data && data.success && (data.affiliateLink || data.link2 || data.link1)) {
        const targetAffiliateUrl = data.affiliateLink || data.link2 || data.link1;

        const newOrder: Order = {
          id: data.clickId || `CLK${Date.now()}${Math.random().toString(36).substring(2, 6)}`,
          productName: checkedProduct.name,
          productImage: checkedProduct.image,
          orderAmount: Math.floor(checkedProduct.price),
          estimatedCashback: Math.floor((Math.floor(checkedProduct.commission || 0)) * 0.5) || Math.floor(checkedProduct.price * (checkedProduct.cashbackRate || 0.07) * 0.5),
          status: 'pending',
          createdTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
          userId: currentUser.id,
          productUrl: data.originUrl || checkedProduct.url,
          shopId: checkedProduct.shopId || data.shopId || '',
          itemId: checkedProduct.itemId || data.itemId || ''
        };
        addOrder(newOrder);

        // Chuyển hướng trực tiếp 1 bước sang link Shopee an_redir
        openUrl(targetAffiliateUrl);
      } else {
        toast.error(data?.message || 'Có lỗi xảy ra khi tạo link hoàn tiền');
      }
    } catch {
      toast.error('Có lỗi xảy ra khi kết nối máy chủ');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép vào bộ nhớ tạm!');
  };

  return (
    <div className="pb-20">

      {/* HERO SECTION - UNIFIED SHOPEE & TIKTOK CASHBACK */}
      <section className="relative overflow-hidden pt-10 md:pt-14 pb-4 md:pb-6 text-center bg-gradient-to-b from-[#FFF2EB]/70 via-[#F8FAFC]/50 to-transparent">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[360px] pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(255,90,31,0.12), rgba(255,90,31,0))' }} />

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto px-4 flex flex-col items-center relative z-10"
        >
          {/* TOP PILL BADGE */}
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/90 border border-orange-200/80 shadow-xs mb-5 backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary fill-primary/30" />
            <span className="text-[11px] md:text-xs font-black uppercase tracking-wider text-primary">
              MUA SẮM THÔNG MINH
            </span>
          </div>

          {/* MAIN HEADING WITH 3D MAGNIFYING GLASS */}
          <div className="flex items-center justify-center gap-3 md:gap-5 mb-4 flex-wrap">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-[1.15] text-center">
              Tìm sản phẩm <br />
              <span className="bg-gradient-to-r from-[#FF5A1F] via-[#FF7A45] to-[#FFA000] bg-clip-text text-transparent">
                Nhận hoàn tiền
              </span>
            </h1>

            {/* 3D MAGNIFYING GLASS WITH % ICON */}
            <div className="relative w-16 h-16 md:w-20 md:h-20 shrink-0 drop-shadow-xl">
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-[#FF5A1F] via-[#FF8A4C] to-orange-100 p-1.5 shadow-lg shadow-orange-500/25">
                <div className="w-full h-full rounded-full bg-gradient-to-b from-orange-50 to-white flex items-center justify-center border-2 border-white">
                  <span className="text-primary font-black text-2xl md:text-3xl">%</span>
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-7 md:h-7 rounded-full bg-gradient-to-tr from-[#E04810] to-[#FFA000] border-2 border-white shadow-md transform rotate-45" />
            </div>
          </div>

          {/* SUBTITLE */}
          <p className="text-sm md:text-base text-slate-500 max-w-lg leading-relaxed mb-8 font-medium">
            Tìm kiếm sản phẩm trên Shopee và TikTok Shop để nhận hoàn tiền tự động.
          </p>

          {/* UNIFIED SEARCH CAPSULE (SHOPEE & TIKTOK) */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleUnifiedSearch();
            }}
            className="w-full max-w-2xl bg-white p-2 rounded-[28px] md:rounded-full shadow-[0_12px_40px_rgba(255,90,31,0.08)] border-2 border-orange-200 ring-4 ring-orange-500/10 flex flex-col sm:flex-row items-center gap-2 mb-3.5 transition-all"
          >
            <div className="flex-1 flex items-center px-3 gap-2.5 w-full">
              <Search className="h-5 w-5 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Dán link sản phẩm Shopee hoặc TikTok Shop bạn muốn mua..."
                value={unifiedLink}
                onChange={(e) => setUnifiedLink(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 outline-none text-slate-800 text-sm md:text-base py-2.5 font-medium placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0 px-1 pb-1 sm:p-0">
              {/* DÁN LINK BUTTON */}
              <button
                type="button"
                onClick={handlePasteLink}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-orange-50 hover:bg-orange-100 text-primary font-bold text-xs md:text-sm border border-orange-200/70 transition-all cursor-pointer shrink-0 active:scale-95"
              >
                <Clipboard className="w-4 h-4 text-primary" />
                <span>Dán link</span>
              </button>

              {/* TÌM BUTTON */}
              <button
                type="submit"
                disabled={isSearching || isTikTokSearching}
                className="flex-1 sm:flex-none inline-flex items-center justify-center px-6 py-2.5 rounded-full gradient-bg hover:opacity-95 text-white font-black text-sm md:text-base shadow-md shadow-primary/25 transition-all cursor-pointer shrink-0 active:scale-95 disabled:opacity-50 min-w-[76px]"
              >
                {isSearching || isTikTokSearching ? (
                  <RefreshCw className="animate-spin w-4 h-4 text-white" />
                ) : (
                  <span>Tìm</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </section>

      {/* RESULTS & FEATURES CONTENT SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-0">
        {/* RESULT CARD - SHOPEE */}
        <AnimatePresence>
          {activePlatform === 'shopee' && checkedProduct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="max-w-2xl mx-auto mb-20"
            >
              <Card className="border-2 border-orange-300 overflow-hidden relative bg-gradient-to-br from-white to-orange-50/20 shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="relative w-full md:w-44 shrink-0">
                      {checkedProduct.image ? (
                        <img
                          src={checkedProduct.image}
                          alt={checkedProduct.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-44 object-cover rounded-card border border-border shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-44 rounded-card border border-border bg-orange-50/50 flex flex-col items-center justify-center text-orange-400 gap-2">
                          <ShoppingBag className="w-10 h-10 text-orange-400" />
                          <span className="text-xs font-semibold text-text-secondary">Shopee</span>
                        </div>
                      )}
                      {checkedProduct.sales > 0 && (
                        <div className="absolute bottom-2 left-2 bg-black/60 backdrop-blur-xs text-white px-2 py-0.5 rounded-md text-[10px] font-semibold">
                          Đã bán: {checkedProduct.sales}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col text-left w-full">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="bg-orange-500 text-white border-none py-1 px-3 text-xs font-bold">Shopee</Badge>
                          {checkedProduct.isXtra && (
                            <Badge className="bg-amber-500 text-white border-none py-1 px-2.5 text-[10px] font-black uppercase tracking-wider animate-pulse">Xtra Co</Badge>
                          )}
                          {checkedProduct.rating && (
                            <span className="flex items-center gap-0.5 text-xs font-bold text-amber-500 bg-amber-55 px-2 py-0.5 rounded-full border border-amber-200">
                              <Star className="h-3 w-3 fill-current" />
                              {checkedProduct.rating}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { toggleFavorite(checkedProduct.url); }}
                            className={`p-2 rounded-full border border-border bg-white shadow-sm hover:scale-105 transition-all ${favorites.includes(checkedProduct.url) ? 'text-danger border-danger/25 bg-red-50/50' : 'text-text-secondary hover:text-text'}`}
                          >
                            <Heart className={`h-4.5 w-4.5 ${favorites.includes(checkedProduct.url) ? 'fill-current' : ''}`} />
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(checkedProduct.url)}
                            className="p-2 rounded-full border border-border bg-white shadow-sm text-text-secondary hover:text-text hover:scale-105 transition-all"
                          >
                            <Share2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-text mb-1 leading-snug line-clamp-2">
                        {checkedProduct.name}
                      </h4>

                      {checkedProduct.shopName && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary mb-4 font-semibold">
                          <Store className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>Shop: {checkedProduct.shopName}</span>
                          <span className="text-border mx-1">|</span>
                          <span className="font-mono text-[10px] text-text-secondary/70">ID: {checkedProduct.itemId}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 bg-white/70 backdrop-blur-sm border border-border/50 p-4 rounded-input shadow-[0_2px_10px_rgba(0,0,0,0.01)] mb-4">
                        <div>
                          <p className="text-xs font-semibold text-text-secondary">Giá sản phẩm</p>
                          <p className="text-lg font-bold text-text">{checkedProduct.price.toLocaleString('vi-VN')}đ</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary flex items-center gap-1">
                            Tiền hoàn dự kiến
                          </p>
                          <p className="text-lg font-extrabold text-primary">
                            {Math.floor((checkedProduct.commission || 0) * 0.5).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>



                      <div className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed mb-4">
                        <AlertCircle className="h-4.5 w-4.5 text-warning shrink-0 mt-0.5" />
                        <p>
                          Tiền hoàn hiển thị chỉ mang tính tham khảo. Tiền hoàn thực tế sẽ được cập nhật sau khi Shopee đối soát.
                        </p>
                      </div>

                      <div>
                        <Button
                          id="btn-buy-now-cashback"
                          onClick={handleCreateAffiliateLink}
                          className="w-full font-extrabold flex items-center justify-center gap-2 group py-4 transition-all text-base shadow-lg rounded-xl bg-primary text-white hover:bg-primary/95 shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                        >
                          <ShoppingBag className="h-5 w-5" />
                          <span>Ấn vào đây mua hàng để nhận hoàn tiền Shopee</span>
                          <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Button>
                      </div>

                      {/* DATA SOURCE AND LAST UPDATE */}
                      <div className="mt-5 pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-2 text-[10px] text-text-secondary/70">
                        <span className="flex items-center gap-1">
                          <Activity className="h-3 w-3 text-primary" />
                          <span>Nguồn dữ liệu: </span>
                          <span className="font-bold text-text-secondary uppercase">
                            {checkedProduct.dataSource === 'api'
                              ? 'API Shopee'
                              : checkedProduct.dataSource === 'db'
                                ? 'Cache Database'
                                : 'Mô phỏng (Fallback)'}
                          </span>
                        </span>
                        <span>Cập nhật: {checkedProduct.lastUpdate}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* RESULT CARD - TIKTOK */}
        <AnimatePresence>
          {activePlatform === 'tiktok' && checkedTikTokProduct && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="max-w-2xl mx-auto mb-20"
            >
              <Card className="border-2 border-slate-300 overflow-hidden relative bg-gradient-to-br from-white to-slate-50/50 shadow-md">
                <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-400/10 rounded-full blur-xl" />
                <CardContent className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    <div className="relative w-full md:w-44 shrink-0">
                      {checkedTikTokProduct.image ? (
                        <img
                          src={checkedTikTokProduct.image}
                          alt={checkedTikTokProduct.name}
                          className="w-full h-44 object-cover rounded-card border border-border shadow-sm"
                        />
                      ) : (
                        <div className="w-full h-44 rounded-card border border-border bg-slate-900 flex flex-col items-center justify-center text-white gap-2">
                          <ShoppingBag className="w-10 h-10 text-[#00F2FE]" />
                          <span className="text-xs font-semibold text-slate-300">TikTok Shop</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col text-left w-full">
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge className="bg-slate-900 text-white border-none py-1 px-3 text-xs font-bold flex items-center gap-1">
                            <span className="text-[#00F2FE]">TikTok</span>
                            <span className="text-[#FE2C55]">Shop</span>
                          </Badge>
                          {(checkedTikTokProduct.userCashbackRate > 0 || checkedTikTokProduct.commissionRate > 0) && (
                            <Badge className="bg-emerald-500 text-white border-none py-1 px-2.5 text-[10px] font-black uppercase tracking-wider">
                              Hoàn {checkedTikTokProduct.userCashbackRate || Number((checkedTikTokProduct.commissionRate * 0.5).toFixed(1))}%
                            </Badge>
                          )}
                        </div>
                      </div>

                      <h4 className="text-base font-bold text-text mb-1 leading-snug line-clamp-2">
                        {checkedTikTokProduct.name}
                      </h4>

                      {checkedTikTokProduct.shopName && (
                        <div className="flex items-center gap-1 text-xs text-text-secondary mb-4 font-semibold">
                          <Store className="h-3.5 w-3.5 text-slate-700 shrink-0" />
                          <span>Shop: {checkedTikTokProduct.shopName}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 bg-white/70 backdrop-blur-sm border border-border/50 p-4 rounded-input shadow-[0_2px_10px_rgba(0,0,0,0.01)] mb-4">
                        <div>
                          <p className="text-xs font-semibold text-text-secondary">Giá sản phẩm</p>
                          <p className="text-lg font-bold text-text">
                            {checkedTikTokProduct.price > 0 ? `${checkedTikTokProduct.price.toLocaleString('vi-VN')}đ` : 'Theo giá app TikTok'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            Tiền hoàn dự kiến
                          </p>
                          <p className="text-lg font-extrabold text-emerald-600">
                            {checkedTikTokProduct.estimatedCashback > 0
                              ? `${checkedTikTokProduct.estimatedCashback.toLocaleString('vi-VN')}đ`
                              : `Lên đến ${checkedTikTokProduct.userCashbackRate || Number(((checkedTikTokProduct.commissionRate || 10) * 0.5).toFixed(1))}%`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 text-xs text-text-secondary leading-relaxed mb-4">
                        <AlertCircle className="h-4.5 w-4.5 text-slate-500 shrink-0 mt-0.5" />
                        <p>
                          Sau khi ấn vào nút bên dưới, vui lòng hoàn tất đặt hàng trong ứng dụng TikTok để hệ thống tự động ghi nhận đơn hoàn tiền vào ví của bạn.
                        </p>
                      </div>

                      <button
                        type="button"
                        id="btn-buy-now-tiktok"
                        onClick={handleOpenTikTokAffiliateLink}
                        className="w-full bg-[#0B0F19] hover:bg-black text-white font-black flex items-center justify-center gap-2.5 py-4 transition-all text-base shadow-xl shadow-black/30 border border-[#00F2FE]/40 rounded-xl cursor-pointer group active:scale-[0.99]"
                      >
                        <ShoppingCart className="h-5 w-5 text-[#00F2FE]" />
                        <span>Ấn vào đây mua hàng để nhận hoàn tiền TikTok</span>
                        <ArrowRight className="h-4 w-4 text-[#00F2FE] group-hover:translate-x-1 transition-transform" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>


        {/* ======================================================== */}
        {/* HƯỚNG DẪN 4 BƯỚC & LƯU Ý (CHIA 2 CỘT NGANG)              */}
        {/* ======================================================== */}
        <div id="guide-and-notes-section" className="scroll-mt-20 max-w-4xl lg:max-w-5xl mx-auto my-8 grid grid-cols-1 md:grid-cols-2 gap-5 text-left items-stretch">
          
          {/* CỘT 1: HƯỚNG DẪN 4 BƯỚC */}
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 mb-4 flex items-center justify-between">
                <span>Hướng dẫn 4 bước</span>
                <span className="text-[11px] font-bold text-primary bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200/60">
                  Shopee &amp; TikTok
                </span>
              </h3>

              {/* 4 STEPS LIST */}
              <div className="space-y-3.5 mb-5">
                {[
                  { step: 1, text: "Sao chép link sản phẩm trên Shopee hoặc TikTok Shop." },
                  { step: 2, text: "Dán link vào ô tìm kiếm ở phía trên." },
                  { step: 3, text: 'Nhấn nút "Tìm" để kiểm tra & lấy link hoàn tiền.' },
                  { step: 4, text: "Mở app mua ngay & nhận tiền hoàn tự động vào ví." }
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {item.step}
                    </span>
                    <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* BUTTON XEM VIDEO HƯỚNG DẪN */}
            <button
              type="button"
              onClick={() => {
                setVideoModalPlatform(activePlatform);
                setIsVideoModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl border border-amber-200 bg-[#FFFDF7] hover:bg-amber-50 text-amber-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99] mt-auto"
            >
              <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] shrink-0">
                ▶
              </span>
              <span>Xem video hướng dẫn</span>
            </button>
          </div>

          {/* CỘT 2: LƯU Ý QUAN TRỌNG */}
          <div className="bg-[#FFFDF5] border-2 border-amber-300 rounded-2xl p-5 sm:p-6 shadow-sm text-left flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-amber-900 font-extrabold text-base sm:text-lg">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>Lưu ý quan trọng</span>
                </div>
              </div>

              <div className="space-y-3 text-xs sm:text-sm text-amber-900/90 font-medium leading-relaxed mb-5">
                <div className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold text-base shrink-0">🚫</span>
                  <span>Không click vào video, livestream trước khi mua để tránh bị ghi đè link hoàn tiền.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-red-500 font-bold text-base shrink-0">🗑</span>
                  <span>Xóa sản phẩm cũ trong giỏ hàng nếu có (chỉ thêm hàng sau khi bấm link hoàn tiền).</span>
                </div>
              </div>
            </div>

            {/* BUTTON XEM CHI TIẾT LƯU Ý */}
            <button
              type="button"
              onClick={() => setIsNotesModalOpen(true)}
              className="w-full py-3 px-4 rounded-xl border border-amber-300 bg-amber-100/60 hover:bg-amber-100 text-amber-900 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs active:scale-[0.99] mt-auto"
            >
              <span>Xem chi tiết tất cả lưu ý</span>
              <span>→</span>
            </button>
          </div>

        </div>

        {/* ======================================================== */}
        {/* POPUP MODAL 1: VIDEO HƯỚNG DẪN CHI TIẾT (THEO ẢNH 2)    */}
        {/* ======================================================== */}
        <AnimatePresence>
          {isVideoModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              {/* BACKDROP */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsVideoModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              />

              {/* MODAL DIALOG */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg sm:max-w-xl md:max-w-2xl bg-white rounded-3xl shadow-2xl z-10 border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[92vh]"
              >
                {/* MODAL HEADER */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-red-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <Play className="w-3.5 h-3.5 fill-white translate-x-0.5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-extrabold text-sm sm:text-base text-slate-900 leading-tight">
                        Hướng dẫn lấy link hoàn tiền
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Xem video ngắn để thao tác chính xác nhất
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsVideoModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                    title="Đóng"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* MODAL BODY (SCROLLABLE) */}
                <div className="p-4 overflow-y-auto space-y-4 text-left">
                  {/* PLATFORM SELECTOR TABS */}
                  <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl gap-1">
                    <button
                      type="button"
                      onClick={() => setVideoModalPlatform('shopee')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                        videoModalPlatform === 'shopee'
                          ? 'bg-[#EE4D2D] text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ShopeeBrandIcon className="w-4 h-4" inverted={videoModalPlatform === 'shopee'} />
                      <span>Shopee</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVideoModalPlatform('tiktok')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all cursor-pointer ${
                        videoModalPlatform === 'tiktok'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <TikTokBrandIcon className="w-4 h-4" />
                      <span>TikTok Shop</span>
                    </button>
                  </div>

                  {/* CLEAN VIDEO CONTAINER (KHÔNG KHUNG ĐIỆN THOẠI, PHÁT CHUẨN TỶ LỆ THEO LINK) */}
                  {(() => {
                    const activeVideoUrl = (videoModalPlatform === 'shopee'
                      ? settings?.shopeeGuideVideoUrl
                      : settings?.tiktokGuideVideoUrl)?.trim();
                    const isShorts = isShortsUrl(activeVideoUrl);
                    const embedUrl = getYouTubeEmbedUrl(activeVideoUrl);

                    return (
                      <div className={`relative mx-auto w-full ${isShorts ? 'max-w-[320px] aspect-[9/16]' : 'aspect-video'} bg-black rounded-2xl shadow-md border border-slate-200 overflow-hidden flex items-center justify-center`}>
                        {embedUrl ? (
                          <iframe
                            key={embedUrl}
                            src={embedUrl}
                            title="Video hướng dẫn"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                          />
                        ) : activeVideoUrl && (activeVideoUrl.startsWith('http://') || activeVideoUrl.startsWith('https://') || activeVideoUrl.startsWith('/')) ? (
                          <video
                            controls
                            playsInline
                            autoPlay
                            loop
                            muted
                            key={activeVideoUrl}
                            className="w-full h-full object-contain bg-black"
                          >
                            <source src={activeVideoUrl} type="video/mp4" />
                            Trình duyệt không hỗ trợ xem video.
                          </video>
                        ) : (
                          <video
                            controls
                            playsInline
                            autoPlay
                            loop
                            muted
                            key={videoModalPlatform}
                            poster={videoModalPlatform === 'shopee' ? "/guide/1-lg.jpg" : "/tiktok/1.jpg"}
                            className="w-full h-full object-contain bg-black"
                          >
                            <source src={videoModalPlatform === 'shopee' ? "/guide/shopee-guide.mp4" : "/guide/tiktok-guide.mp4"} type="video/mp4" />
                            Trình duyệt không hỗ trợ xem video.
                          </video>
                        )}
                      </div>
                    );
                  })()}

                  {/* 3 STEPS SUMMARY BELOW VIDEO */}
                  <div className="space-y-2.5 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 text-xs">
                    {videoModalPlatform === 'shopee' ? (
                      <>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-[#EE4D2D] text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
                          <p>Mở sản phẩm cần mua ở Shopee &gt; Chia sẻ &gt; <strong className="text-emerald-600 font-bold">sao chép link</strong></p>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-[#EE4D2D] text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">2</span>
                          <p>Dán vào hệ thống &amp; bấm <strong className="text-emerald-600 font-bold">"Tìm / Lấy link hoàn tiền"</strong></p>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-[#EE4D2D] text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">3</span>
                          <p>Mở app Shopee và hoàn tất đặt hàng như bình thường</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">1</span>
                          <p>Mở sản phẩm trên app TikTok &gt; Bấm Chia sẻ &gt; <strong className="text-cyan-600 font-bold">Sao chép liên kết</strong></p>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">2</span>
                          <p>Dán link vào hệ thống &amp; bấm <strong className="text-cyan-600 font-bold">"Tìm / Lấy link hoàn tiền"</strong></p>
                        </div>
                        <div className="flex items-start gap-2.5 text-slate-700">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-black text-[11px] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">3</span>
                          <p>Chuyển sang app TikTok và thanh toán ngay trong phiên mua</p>
                        </div>
                      </>
                    )}

                    {/* Alert Box */}
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2 mt-2">
                      <span className="text-amber-600 text-xs mt-0.5 shrink-0">💡</span>
                      <p>
                        {videoModalPlatform === 'shopee'
                          ? 'Đơn hàng Shopee sẽ được ghi nhận vào ngày hôm sau sau khi đối soát. Hệ thống sẽ tự động cập nhật tiền hoàn vào ví của bạn.'
                          : 'Đơn hàng TikTok Shop thường sẽ được ghi nhận trong vòng 1 tiếng sau khi đặt mua thành công. Hệ thống sẽ tự động cập nhật tiền hoàn vào ví của bạn.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* MODAL FOOTER */}
                <div className="p-4 border-t border-slate-100 bg-white">
                  <button
                    type="button"
                    onClick={() => {
                      setIsVideoModalOpen(false);
                      const searchInput = document.querySelector('input[placeholder*="Dán link sản phẩm"]') as HTMLInputElement;
                      if (searchInput) {
                        searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        searchInput.focus();
                      }
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-white font-extrabold text-sm shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Đã hiểu, thử ngay
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ======================================================== */}
        {/* POPUP MODAL 2: CHI TIẾT LƯU Ý QUAN TRỌNG                */}
        {/* ======================================================== */}
        <AnimatePresence>
          {isNotesModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
              {/* BACKDROP */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsNotesModalOpen(false)}
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
              />

              {/* MODAL DIALOG */}
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 15 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 15 }}
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl z-10 border border-slate-200 overflow-hidden flex flex-col my-auto max-h-[90vh]"
              >
                {/* HEADER */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-amber-50/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-extrabold text-base text-slate-900 leading-tight">
                        Lưu ý quan trọng khi mua hàng
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Để đảm bảo 100% đơn hàng được ghi nhận tiền hoàn vào ví
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNotesModalOpen(false)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* BODY */}
                <div className="p-5 overflow-y-auto space-y-3.5 text-left text-xs sm:text-sm">
                  {[
                    {
                      icon: <ShoppingCart className="w-4.5 h-4.5 text-primary" />,
                      title: "1. Giỏ hàng phải trống trước khi bấm link",
                      desc: "Chỉ thêm sản phẩm vào giỏ hàng SAU KHI bạn đã nhấn vào link hoàn tiền từ hệ thống."
                    },
                    {
                      icon: <Link2 className="w-4.5 h-4.5 text-purple-600" />,
                      title: "2. Không nhấn vào link khác trước khi thanh toán",
                      desc: "Tránh click vào link Facebook, Telegram, YouTube, livestream hoặc link của KOLs khác để không bị ghi đè hoa hồng."
                    },
                    {
                      icon: <Clock className="w-4.5 h-4.5 text-amber-600" />,
                      title: "3. Hoàn tất đơn hàng sớm (trong vòng 20 - 30 phút)",
                      desc: "Phiên làm việc của link có hạn. Đặt hàng ngay sau khi mở app để đảm bảo cookie ghi nhận chính xác."
                    },
                    {
                      icon: <ShieldCheck className="w-4.5 h-4.5 text-blue-600" />,
                      title: "4. Tắt tiện ích chặn quảng cáo (AdBlock)",
                      desc: "Nếu dùng trình duyệt máy tính, hãy tắt AdBlock để hệ thống không bị chặn mã tracking đối soát."
                    },
                    {
                      icon: <RefreshCw className="w-4.5 h-4.5 text-emerald-600" />,
                      title: "5. Lấy link mới nếu hủy đơn hoặc đổi ý",
                      desc: "Nếu bạn hủy đơn hàng hoặc muốn mua sản phẩm khác, hãy quay lại website để lấy link hoàn tiền mới."
                    }
                  ].map((note, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-2xs shrink-0 mt-0.5">
                        {note.icon}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 mb-0.5">{note.title}</h4>
                        <p className="text-slate-600 text-xs leading-relaxed">{note.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FOOTER */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/70 text-right">
                  <Button
                    onClick={() => setIsNotesModalOpen(false)}
                    className="w-full font-bold py-3 bg-primary text-white hover:bg-primary/95 rounded-xl shadow-xs"
                  >
                    Đã rõ, đóng lại
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* REFERRAL PROMO BANNER — NGẮN GỌN 3 QUYỀN LỢI */}
        <div className="max-w-7xl mx-auto mt-10 md:mt-14 bg-gradient-to-br from-white via-orange-50/40 to-amber-50/40 rounded-3xl p-8 md:p-12 relative overflow-hidden border-2 border-orange-200/90 shadow-md">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-orange-100/60 to-amber-50/30 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-rose-50/50 to-orange-50/30 rounded-full blur-[60px] translate-y-1/3 -translate-x-1/3 pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-10">
            {/* Left Text Content */}
            <div className="max-w-xl text-left flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm">
                  🎁 Người mới +30.000đ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500 text-white rounded-full text-xs font-extrabold uppercase tracking-wider shadow-sm">
                  <Users className="h-3.5 w-3.5" /> Mời 1 bạn +5.000đ
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-xs font-extrabold uppercase tracking-wider border border-rose-200">
                  🔥 +20% mỗi đơn
                </span>
              </div>

              <h2 className="text-3xl md:text-5xl font-black text-text mb-5 leading-[1.15] tracking-tight">
                Mời bạn bè nhận <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-primary">+5.000đ & 20%</span> mỗi đơn
              </h2>

              <div className="space-y-2.5 mb-7 text-sm font-medium text-slate-700">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
                  <span><strong className="text-emerald-600 font-black">Tặng +30.000đ</strong> cho người mới đăng ký tài khoản.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-orange-500 shrink-0" />
                  <span><strong className="text-orange-600 font-black">Thưởng +5.000đ / người</strong> (Vào Chờ duyệt, khi cấp dưới hoàn thành đơn đầu tiên thì tiền thưởng sẽ được cộng vào ví).</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4.5 w-4.5 text-rose-500 shrink-0" />
                  <span><strong className="text-rose-600 font-black">Cộng +20% tiền hoàn của bạn bè</strong> mỗi đơn <em>(VD: Bạn bè hoàn 5k → Bạn +1k)</em>.</span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {currentUser ? (
                  <Button onClick={() => {
                    const refLink = `${window.location.origin}/auth?mode=register&ref=${currentUser.id}`;
                    navigator.clipboard.writeText(refLink);
                    toast.success('Đã sao chép link giới thiệu!');
                  }} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95">
                    <Copy className="h-5 w-5" /> Sao Chép Link Giới Thiệu
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/auth?mode=register')} className="bg-primary hover:bg-primary/90 text-white font-bold px-8 py-3.5 rounded-full shadow-lg shadow-primary/30 flex items-center gap-2.5 transition-all hover:scale-105 active:scale-95">
                    Đăng Ký Nhận 30.000đ Ngay
                  </Button>
                )}
                <Button
                  onClick={() => navigate('/referral')}
                  variant="outline"
                  className="rounded-full px-6 py-3.5 font-bold border-orange-200 text-slate-700 hover:bg-orange-50"
                >
                  Xem mục Giới thiệu →
                </Button>
              </div>
            </div>

            {/* Right Floating Cards */}
            <div className="flex-shrink-0 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3.5 relative">
              <div className="bg-white p-5 rounded-2xl border-2 border-emerald-300 shadow-md flex items-center gap-4 min-w-[240px]">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Người mới đăng ký</div>
                  <h3 className="text-2xl font-black text-emerald-600">+30.000đ</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-orange-400 shadow-lg flex items-center gap-4 min-w-[240px]">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                  <Users className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Mời 1 bạn bè</div>
                  <h3 className="text-2xl font-black text-orange-600">+5.000đ</h3>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border-2 border-rose-300 shadow-md flex items-center gap-4 min-w-[240px]">
                <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl flex items-center justify-center text-white shadow-sm shrink-0">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="text-left">
                  <div className="text-[11px] font-bold text-slate-400 uppercase">Hoa hồng mỗi đơn</div>
                  <h3 className="text-2xl font-black text-rose-600">+20%</h3>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* FEATURE CARDS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-7xl mx-auto mt-12 md:mt-14">
          {[
            { icon: <Zap className="h-6 w-6 text-primary" />, title: "Miễn phí", desc: "Không phát sinh bất kỳ chi phí ẩn nào khi sử dụng hệ thống." },
            { icon: <CheckCircle2 className="h-6 w-6 text-success" />, title: "Nhanh chóng", desc: "Tạo link hoàn tiền và chuyển khoản tự động tức thì." },
            { icon: <ShieldCheck className="h-6 w-6 text-info" />, title: "An toàn", desc: "Bảo mật thông tin đơn hàng và tài khoản ngân hàng tuyệt đối." },
            { icon: <LineChart className="h-6 w-6 text-accent" />, title: "Đối soát minh bạch", desc: "Cập nhật dữ liệu từ Shopee rõ ràng, chi tiết từng giao dịch." }
          ].map((item, idx) => (
            <div key={idx} className="bg-white border-2 border-slate-200/90 hover:border-orange-300 p-6 rounded-card shadow-sm hover:shadow-md text-left hover:translate-y-[-5px] transition-all duration-300">
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-[16px] inline-block mb-4">
                {item.icon}
              </div>
              <h3 className="font-bold text-text text-base mb-2">{item.title}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl font-extrabold text-text mb-4">
            Đánh giá từ <span className="text-primary">thành viên tiết kiệm</span>
          </h2>
          <p className="text-sm text-text-secondary">
            Lắng nghe trải nghiệm của những người dùng thông thái đã mua sắm và tích lũy được hàng triệu đồng cùng chúng tôi.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              quote: "Hồi đầu thấy hoàn tiền mấy nghìn một món tưởng ít, ai ngờ cộng dồn mua cả cái tủ lạnh với điện thoại sau 3 tháng vào ví rút được hơn 2 triệu luôn. Siêu ưng ý!",
              author: "Chị Minh Thư",
              role: "Mua sắm gia đình, Hà Nội",
              avatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Là tín đồ Shopee đặt hàng mỗi ngày, từ khi biết trang web này mình tiết kiệm được hẳn 10% chi phí mua sắm. Thao tác dán link tạo mã mất chưa tới 5 giây, cực kỳ tiện lợi.",
              author: "Bạn Hoàng Nam",
              role: "Sinh viên, TP. HCM",
              avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150"
            },
            {
              quote: "Rút tiền cực kỳ nhanh và minh bạch. Chỉ cần đủ 50k là tạo yêu cầu chuyển khoản, chiều hôm trước rút sáng hôm sau tiền đã ting ting tài khoản. Sẽ giới thiệu cho bạn bè dùng thử.",
              author: "Anh Quốc Bảo",
              role: "Nhân viên văn phòng, Đà Nẵng",
              avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150"
            }
          ].map((item, idx) => (
            <Card key={idx} className="bg-white border-2 border-slate-200/90 p-6 flex flex-col justify-between h-full relative rounded-card shadow-sm hover:border-slate-300 transition-colors">
              <div className="absolute top-6 right-6 text-primary/10">
                <MessageSquare className="h-10 w-10 fill-current" />
              </div>
              <div>
                <div className="flex gap-1 mb-4 text-warning">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="text-xs md:text-sm text-text-secondary leading-relaxed italic mb-6">
                  "{item.quote}"
                </p>
              </div>
              <div className="flex items-center gap-3">
                <img src={item.avatar} alt={item.author} className="w-11 h-11 rounded-full object-cover border border-border" />
                <div>
                  <h4 className="font-bold text-text text-sm leading-tight">{item.author}</h4>
                  <p className="text-[10px] text-text-secondary font-semibold">{item.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* FREQUENTLY ASKED QUESTIONS */}
      <section id="hoi-dap" className="bg-white py-20 border-t border-border/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-text mb-4">
              Giải đáp thắc mắc thường gặp
            </h2>
            <p className="text-sm text-text-secondary">
              Mọi thắc mắc của bạn về quy trình hoàn tiền, đối soát và rút số dư sẽ được trả lời tại đây.
            </p>
          </div>

          <Accordion>
            <AccordionItem title="Quy trình hoàn tiền hoạt động như thế nào?" isOpenDefault={true}>
              Chúng tôi liên kết với các sàn thương mại điện tử qua chương trình Tiếp thị liên kết (Affiliate Marketing). Khi bạn tạo link hoàn tiền và mua sắm thông qua hệ thống, bạn sẽ nhận được Tiền Hoàn tự động vào ví sau khi đơn hàng được ghi nhận và đối soát thành công.
            </AccordionItem>
            <AccordionItem title="Tại sao đơn hàng đã hoàn thành nhưng tiền hoàn vẫn ở trạng thái Chờ đối soát?">
              Sau khi bạn nhận hàng thành công, Shopee cần thời gian thông thường 7 ngày để đối soát, xác nhận không xảy ra trả hàng, hoàn tiền hoặc gian lận. Khi Shopee phê duyệt đơn hàng, hệ thống sẽ tự động cập nhật số dư khả dụng cho bạn rút tiền.
            </AccordionItem>
            <AccordionItem title="Số dư tối thiểu để rút tiền là bao nhiêu?">
              Hạn mức rút tiền tối thiểu của ví hoàn tiền là 50.000đ. Người mới đăng ký được tặng ngay 30.000đ vào ví, chỉ cần mua sắm hoàn tiền hoặc giới thiệu bạn bè tích lũy thêm 20.000đ để đạt đủ 50.000đ là có thể rút thẳng về ngân hàng.
            </AccordionItem>
            <AccordionItem title="Chương trình giới thiệu bạn bè (+5.000đ/người) hoạt động thế nào?">
              Khi bạn chia sẻ link hoặc mã giới thiệu cho bạn bè: người mới đăng ký nhận ngay 30.000đ vào ví, còn bạn nhận ngay +5.000đ vào mục Chờ duyệt. Ngay khi người được giới thiệu (cấp dưới) hoàn thành đơn hàng đầu tiên, +5.000đ sẽ được duyệt và cộng thẳng vào Số dư khả dụng của bạn.
            </AccordionItem>
            <AccordionItem title="Tôi có cần tạo tài khoản để được nhận hoàn tiền không?">
              Bạn có thể sử dụng công cụ kiểm tra tiền hoàn miễn phí mà không cần đăng nhập. Tuy nhiên, để tạo link mua hàng, tích lũy số dư và rút tiền về tài khoản ngân hàng, bạn bắt buộc phải đăng nhập/đăng ký tài khoản để hệ thống có thể ghi nhận đúng mã định danh của bạn.
            </AccordionItem>
            <AccordionItem title="Tôi có được hoàn tiền khi áp dụng mã giảm giá của Shopee không?">
              Có! Bạn vẫn nhận được tiền hoàn bình thường dựa trên số tiền thanh toán thực tế (sau khi đã áp dụng Shopee Voucher, Shop Voucher và Shopee Xu).
            </AccordionItem>
          </Accordion>
        </div>
      </section>
    </div>
  );
}
