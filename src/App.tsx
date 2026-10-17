import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  QrCode,
  RefreshCw
} from 'lucide-react';

import AdminPage from './components/AdminPage';

interface DistanceStat {
  distance: string;
  notCheckedIn: number;
  checkedIn: number;
  total: number;
  isTotal?: boolean;
}

interface ApiRacekitItem {
  "TEN GIAI"?: string;
  "ID GIAI"?: string;
  "CU LY": string;
  "CHECKIN": string | number;
  "NOT CHECKIN": string | number;
  "TONG SO": string | number;
}

// Initial fallback values matching original screenshot
const defaultStatsData: DistanceStat[] = [
  { distance: '5', notCheckedIn: 1308, checkedIn: 1446, total: 2754 },
  { distance: '10', notCheckedIn: 1674, checkedIn: 1279, total: 2953 },
  { distance: '21', notCheckedIn: 1747, checkedIn: 1314, total: 3061 },
  { distance: '42', notCheckedIn: 994, checkedIn: 1048, total: 2042 },
  { distance: 'Total', notCheckedIn: 5723, checkedIn: 5087, total: 10810, isTotal: true },
];

const SUPABASE_URL = 'https://kovcyocsqxqnpnzorsgn.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_wJB7lJtbHit8rlR8yED0Gg_yFk7MEkM';

function parseRacekitData(apiItems: ApiRacekitItem[], fakeOffsets: Record<string, number> = {}): DistanceStat[] {
  const distanceOrder = ['5', '10', '21', '42'];
  const mapped: Record<string, DistanceStat> = {};

  apiItems.forEach(item => {
    // Parse distance from "5KM ", "10KM ", etc. (ignore TEN GIAI and ID GIAI as requested)
    const rawCuLy = (item["CU LY"] || "").toUpperCase().replace(/[^0-9]/g, '').trim();
    if (rawCuLy) {
      const checkedIn = parseInt(String(item["CHECKIN"] || 0).replace(/,/g, ''), 10) || 0;
      const baseNotCheckedIn = parseInt(String(item["NOT CHECKIN"] || 0).replace(/,/g, ''), 10) || 0;
      
      // Cộng số lượng theo từng cự ly ở trang admin vào số Not Checked-in
      const fakeBonus = Number(fakeOffsets[rawCuLy]) || 0;
      const notCheckedIn = baseNotCheckedIn + fakeBonus;
      const total = checkedIn + notCheckedIn;

      mapped[rawCuLy] = {
        distance: rawCuLy,
        checkedIn,
        notCheckedIn,
        total,
      };
    }
  });

  // Ensure strict distance order 5, 10, 21, 42
  const list: DistanceStat[] = distanceOrder.map(dist => {
    return mapped[dist] || {
      distance: dist,
      checkedIn: 0,
      notCheckedIn: 0,
      total: 0
    };
  });

  // Calculate Total row: sum of all 4 distances
  const totalCheckedIn = list.reduce((sum, item) => sum + item.checkedIn, 0);
  const totalNotCheckedIn = list.reduce((sum, item) => sum + item.notCheckedIn, 0);
  const grandTotal = list.reduce((sum, item) => sum + item.total, 0);

  list.push({
    distance: 'Total',
    checkedIn: totalCheckedIn,
    notCheckedIn: totalNotCheckedIn,
    total: grandTotal,
    isTotal: true
  });

  return list;
}

export default function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#/admin')) {
        return '/admin';
      }
    }
    return '/';
  });

  const [stats, setStats] = useState<DistanceStat[] | null>(null);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [fakeOffsets, setFakeOffsets] = useState<Record<string, number>>({
    '5': 0,
    '10': 0,
    '21': 0,
    '42': 0,
  });
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'O_ID' | 'BIB' | 'TÊN' | 'EMAIL' | 'CCCD' | 'PHONE'>('BIB');
  const [searchValue, setSearchValue] = useState('Nguyễn Văn Tiến');
  const [vpimCode, setVpimCode] = useState('VPIM2026');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const numberWeight = '300';

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch live stats from backend endpoint /api/racekit-stats
  // (Server cộng số fake vào Not Checked-in hoàn tất rồi mới trả kết quả ra FE)
  const fetchLiveStats = async () => {
    setIsLoadingApi(true);
    setApiError(null);
    try {
      const res = await fetch('/api/racekit-stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        setStats(json.data);
        if (json.fakeOffsets) setFakeOffsets(json.fakeOffsets);
        setLastUpdated(json.updatedAt || new Date().toLocaleTimeString('vi-VN'));
        setIsReady(true);
      } else {
        throw new Error(json.error || 'Dữ liệu không hợp lệ');
      }
    } catch (err: any) {
      console.error('Fetch live racekit error:', err);
      setApiError(err.message || 'Lỗi API');
      // Fallback: nếu gọi backend proxy gặp sự cố, tính toán trực tiếp
      try {
        const directApi = await fetch('/api/total-racekit?match_id=97&token=968a46e5053895ca9f2adab1a586cf9d').then(r => r.json());
        const directSupa = await fetch(`${SUPABASE_URL}fake_distance?id=eq.6`, {
          headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
        }).then(r => r.json()).catch(() => []);
        const currentFake = (directSupa && directSupa[0]) ? {
          '5': Number(directSupa[0]['5']) || 0,
          '10': Number(directSupa[0]['10']) || 0,
          '21': Number(directSupa[0]['21']) || 0,
          '42': Number(directSupa[0]['42']) || 0,
        } : fakeOffsets;
        const parsed = parseRacekitData(directApi, currentFake);
        setStats(parsed);
        setIsReady(true);
      } catch (fallbackErr) {
        setStats(defaultStatsData);
        setIsReady(true);
      }
    } finally {
      setIsLoadingApi(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    // Auto refresh every 30 seconds
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.startsWith('/admin') || window.location.hash.startsWith('#/admin')) {
        setCurrentPath('/admin');
      } else {
        setCurrentPath('/');
        fetchLiveStats();
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    window.history.pushState({}, '', path);
    if (path === '/') {
      fetchLiveStats();
    }
  };

  const handleScrollToBottom = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ 
        top: scrollContainerRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  if (currentPath === '/admin') {
    return <AdminPage onBackToHome={() => navigateTo('/')} />;
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1] text-[#222222] flex flex-col items-center justify-start">
      {/* Main Container */}
      <main className="w-full flex-1 flex justify-center p-0 md:py-6 items-start">
        <div className="w-full transition-all duration-200 flex justify-center max-w-[420px]">
          {/* Screen Wrapper */}
          <div className="w-full bg-white relative md:rounded-2xl md:shadow-2xl md:border md:border-gray-300 overflow-hidden">
            {/* Scrollable Viewport */}
            <div 
              ref={scrollContainerRef}
              className="w-full h-screen md:h-[844px] md:max-h-[92vh] overflow-y-auto flex flex-col bg-white relative scroll-smooth"
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              {/* PAGE CONTENT (Exact match to Photo 2) */}
              <div className="px-4 pt-3 pb-1 shrink-0">
                
                {/* 1. Filter Buttons: Row 1 */}
                <div className="grid grid-cols-5 gap-2 mb-2">
                  {(['O_ID', 'BIB', 'TÊN', 'EMAIL', 'CCCD'] as const).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveTab(tab)}
                        className={`h-[44px] rounded-[4px] font-semi-condensed font-semibold text-[18px] tracking-normal uppercase flex items-center justify-center transition-colors ${
                          isActive
                            ? 'bg-[#3545A2] text-white border-transparent'
                            : 'bg-white border border-[#cfd4dc] text-[#374151] hover:bg-gray-50'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>

                {/* 2. Filter Buttons: Row 2 */}
                <div className="grid grid-cols-5 gap-2 mb-3.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('PHONE')}
                    className={`h-[44px] rounded-[4px] font-semi-condensed font-semibold text-[18px] tracking-normal uppercase flex items-center justify-center transition-colors ${
                      activeTab === 'PHONE'
                        ? 'bg-[#3545A2] text-white border-transparent'
                        : 'bg-white border border-[#cfd4dc] text-[#374151] hover:bg-gray-50'
                    }`}
                  >
                    PHONE
                  </button>

                  {/* QR Code Button */}
                  <button
                    type="button"
                    onClick={() => setIsQrModalOpen(true)}
                    className="h-[44px] rounded-[4px] bg-white border border-[#cfd4dc] flex items-center justify-center text-[#2A2A2A] hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    title="Quét mã QR"
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-gray-800"
                    >
                      {/* Top-left square */}
                      <rect x="3" y="3" width="7" height="7" rx="0.5" />
                      {/* Top-right square */}
                      <rect x="14" y="3" width="7" height="7" rx="0.5" />
                      {/* Bottom-left square */}
                      <rect x="3" y="14" width="7" height="7" rx="0.5" />
                      {/* Bottom-right dots */}
                      <rect x="14" y="14" width="2.5" height="2.5" fill="currentColor" stroke="none" />
                      <rect x="18.5" y="14" width="2.5" height="2.5" fill="currentColor" stroke="none" />
                      <rect x="14" y="18.5" width="2.5" height="2.5" fill="currentColor" stroke="none" />
                      <rect x="18.5" y="18.5" width="2.5" height="2.5" fill="currentColor" stroke="none" />
                    </svg>
                  </button>
                </div>

                {/* 3. Search & Event Code Row */}
                <div className="flex items-center gap-2.5">
                  {/* Left: Search input with solid blue border and blue text */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      className="w-full h-[46px] px-3.5 bg-white border border-[#3545A2] rounded-[3px] text-[#3545A2] text-[18px] font-normal focus:outline-none focus:ring-1 focus:ring-[#3545A2]"
                      placeholder="Nhập tên..."
                    />
                    {searchValue && (
                      <button
                        type="button"
                        onClick={() => setSearchValue('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Right: VPIM Code box */}
                  <div className="w-[102px] shrink-0">
                    <input
                      type="text"
                      value={vpimCode}
                      onChange={(e) => setVpimCode(e.target.value)}
                      className="w-full h-[46px] px-2 text-center bg-white border border-[#cfd4dc] rounded-[3px] text-[#111827] text-[16.5px] font-medium tracking-tight focus:outline-none focus:border-gray-400"
                    />
                  </div>
                </div>

                {/* 4. Section Title: "Thống kê Check-in" */}
                <h2 className="text-center font-condensed font-bold text-[23px] text-[#2c3038] tracking-tight mt-6 mb-3">
                  Thống kê Check-in
                </h2>
              </div>

              {/* 5. Statistics Rows List (5, 10, 21, 42, and Total) */}
              <div className="w-full flex flex-col flex-1">
                {!isReady || !stats ? (
                  <div className="w-full py-20 flex flex-col items-center justify-center gap-3">
                    <RefreshCw className="w-7 h-7 animate-spin text-[#3545A2]" />
                    <span className="font-condensed font-medium text-[16px] text-[#4B5563] tracking-wide">
                      Đang đồng bộ số liệu và tính toán cự ly...
                    </span>
                  </div>
                ) : (
                  stats.map((stat) => {
                  if (stat.isTotal) {
                    // Total Card (Image 1): Warm pale cream background
                    return (
                      <div 
                        key={stat.distance} 
                        className="w-full bg-[#FCF6E8] py-4 px-4 my-1 flex items-center border-t border-b border-[#F7EED8]"
                      >
                        {/* Left column: "Total" */}
                        <div className="w-[105px] shrink-0 text-center">
                          <span className="font-condensed font-bold text-[36px] leading-none text-[#2B2B2B] tracking-tight">
                            Total
                          </span>
                        </div>

                        {/* Right column: 3 metrics aligned exactly like the screenshot */}
                        <div className="w-[210px] shrink-0 flex flex-col gap-[2px]">
                          {/* Not Checked-in */}
                          <div className="grid grid-cols-[130px_1fr] items-center">
                            <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                              Not Checked-in
                            </span>
                            <span className="font-condensed font-bold text-[18.5px] text-[#0091DA] tracking-wide tabular-nums text-right">
                              {stat.notCheckedIn}
                            </span>
                          </div>

                          {/* Checked-in */}
                          <div className="grid grid-cols-[130px_1fr] items-center">
                            <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                              Checked-in
                            </span>
                            <span className="font-condensed font-bold text-[18.5px] text-[#D32F2F] tracking-wide tabular-nums text-right">
                              {stat.checkedIn}
                            </span>
                          </div>

                          {/* Total */}
                          <div className="grid grid-cols-[130px_1fr] items-center">
                            <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                              Total
                            </span>
                            <span className="font-condensed font-bold text-[18.5px] text-[#1F2937] tracking-wide tabular-nums text-right">
                              {stat.total}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Standard distance row (5, 10, 21, 42)
                  return (
                    <div 
                      key={stat.distance} 
                      className="w-full py-4 px-4 flex items-center border-b border-[#E5E7EB] bg-white"
                    >
                      {/* Left column: Large Distance Number with thinner line weight */}
                      <div className="w-[105px] shrink-0 text-center flex items-center justify-center">
                        <span 
                          className="font-condensed text-[58px] leading-none text-[#18181B] tracking-tight transition-all duration-150"
                          style={{ fontWeight: Number(numberWeight) }}
                        >
                          {stat.distance}
                        </span>
                      </div>

                      {/* Right column: 3 metric rows */}
                      <div className="w-[210px] shrink-0 flex flex-col gap-[2px]">
                        {/* Not Checked-in */}
                        <div className="grid grid-cols-[130px_1fr] items-center">
                          <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                            Not Checked-in
                          </span>
                          <span className="font-condensed font-bold text-[18.5px] text-[#0091DA] tracking-wide tabular-nums text-right">
                            {stat.notCheckedIn}
                          </span>
                        </div>

                        {/* Checked-in */}
                        <div className="grid grid-cols-[130px_1fr] items-center">
                          <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                            Checked-in
                          </span>
                          <span className="font-condensed font-bold text-[18.5px] text-[#D32F2F] tracking-wide tabular-nums text-right">
                            {stat.checkedIn}
                          </span>
                        </div>

                        {/* Total */}
                        <div className="grid grid-cols-[130px_1fr] items-center">
                          <span className="font-condensed text-[16.5px] text-[#444444] font-normal tracking-wide">
                            Total
                          </span>
                          <span className="font-condensed font-bold text-[18.5px] text-[#1F2937] tracking-wide tabular-nums text-right">
                            {stat.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

                {/* Extra spacing below Total row as visible in Image 1 */}
                <div className="h-4"></div>
              </div>

              {/* 6. Bottom Action Button: "Thống kê Checkin" */}
              {/* Sticky bottom container just like the iPhone viewport */}
              <div className="sticky bottom-0 left-0 right-0 w-full bg-white px-4 py-3 border-t border-gray-100 z-20 shadow-2xs">
                <button
                  type="button"
                  onClick={handleScrollToBottom}
                  className="w-full h-[48px] bg-white border border-[#D1D5DB] rounded-[4px] text-[#2c3038] font-condensed font-normal text-[18px] tracking-tight flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Thống kê Checkin
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* QR Code Scanner Dialog Modal */}
      {isQrModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setIsQrModalOpen(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="font-semibold text-lg text-gray-900 mb-1">Quét mã QR Check-in</h3>
            <p className="text-xs text-gray-500 mb-4">
              Hướng camera vào mã QR của VĐV để tìm kiếm thông tin
            </p>
            <div className="w-full aspect-square bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center relative overflow-hidden">
              <QrCode className="w-24 h-24 text-gray-400 stroke-1" />
              <div className="absolute inset-x-8 top-1/2 h-0.5 bg-red-500 shadow-sm animate-pulse" />
            </div>
            <button
              onClick={() => {
                setSearchValue('Nguyễn Văn Tiến');
                setActiveTab('BIB');
                setIsQrModalOpen(false);
              }}
              className="w-full mt-4 py-2.5 bg-[#3545A2] text-white rounded font-medium text-sm hover:bg-[#2c3b8c] transition-colors"
            >
              Chọn VĐV: Nguyễn Văn Tiến
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
