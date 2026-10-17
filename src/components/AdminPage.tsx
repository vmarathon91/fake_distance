import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Save, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Lock,
  Server,
  Calculator,
  Eye,
  Activity,
  ArrowRight,
  TrendingUp,
  Sparkles,
  RotateCcw
} from 'lucide-react';

interface FakeDistanceRecord {
  id: number;
  '5': number | null;
  '10': number | null;
  '21': number | null;
  '42': number | null;
  [key: string]: any;
}

interface BaseDistanceStat {
  distance: string;
  checkedIn: number;
  notCheckedIn: number;
  total: number;
}

const SUPABASE_URL = 'https://kovcyocsqxqnpnzorsgn.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_wJB7lJtbHit8rlR8yED0Gg_yFk7MEkM';
const TARGET_ID = 6; // Fixed target ID as requested by user

// Baseline numbers matching original VnExpress API
const defaultBaseStats: Record<string, BaseDistanceStat> = {
  '5': { distance: '5', notCheckedIn: 1308, checkedIn: 1446, total: 2754 },
  '10': { distance: '10', notCheckedIn: 1674, checkedIn: 1279, total: 2953 },
  '21': { distance: '21', notCheckedIn: 1747, checkedIn: 1314, total: 3061 },
  '42': { distance: '42', notCheckedIn: 994, checkedIn: 1048, total: 2042 },
};

export default function AdminPage({ onBackToHome }: { onBackToHome: () => void }) {
  const [val5, setVal5] = useState<number>(0);
  const [val10, setVal10] = useState<number>(0);
  const [val21, setVal21] = useState<number>(0);
  const [val42, setVal42] = useState<number>(0);

  const [baseStats, setBaseStats] = useState<Record<string, BaseDistanceStat>>(defaultBaseStats);
  const [apiSyncedAt, setApiSyncedAt] = useState<string>('');
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<FakeDistanceRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

  // Fetch real base stats from backend API
  const fetchBaseApi = async () => {
    setIsLoadingApi(true);
    try {
      const res = await fetch('/api/racekit-stats');
      if (res.ok) {
        const json = await res.json();
        if (json.baseStats) {
          setBaseStats(json.baseStats);
          if (json.updatedAt) setApiSyncedAt(json.updatedAt);
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy số gốc từ API VnExpress:', err);
    } finally {
      setIsLoadingApi(false);
    }
  };

  // Fetch record ID 6 from Supabase fake_distance table
  const fetchTargetRecord = async () => {
    setIsFetching(true);
    try {
      const res = await fetch(`${SUPABASE_URL}fake_distance?id=eq.${TARGET_ID}`, {
        method: 'GET',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Lỗi HTTP ${res.status}`);
      }

      const data: FakeDistanceRecord[] = await res.json();

      if (data && data.length > 0) {
        const rec = data[0];
        setCurrentRecord(rec);
        if (rec['5'] !== null && rec['5'] !== undefined) setVal5(Number(rec['5']));
        if (rec['10'] !== null && rec['10'] !== undefined) setVal10(Number(rec['10']));
        if (rec['21'] !== null && rec['21'] !== undefined) setVal21(Number(rec['21']));
        if (rec['42'] !== null && rec['42'] !== undefined) setVal42(Number(rec['42']));
      } else {
        const allRes = await fetch(`${SUPABASE_URL}fake_distance?select=*`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
          }
        });
        const allData = await allRes.json().catch(() => []);
        if (allData.length > 0) {
          setCurrentRecord(allData[0]);
        }
      }
    } catch (err: any) {
      console.error('Fetch target record error:', err);
      setMessage({
        type: 'error',
        text: `Không thể tải bản ghi ID ${TARGET_ID} từ Supabase`,
        details: err.message
      });
    } finally {
      setIsFetching(false);
    }
  };

  const refreshAll = () => {
    fetchBaseApi();
    fetchTargetRecord();
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Save / Overwrite data to Supabase fake_distance exclusively at ID 6
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const payload = {
      '5': Number(val5) || 0,
      '10': Number(val10) || 0,
      '21': Number(val21) || 0,
      '42': Number(val42) || 0,
    };

    try {
      const res = await fetch(`${SUPABASE_URL}fake_distance?id=eq.${TARGET_ID}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(payload)
      });

      const responseText = await res.text();
      let resData: any = null;
      try {
        resData = JSON.parse(responseText);
      } catch (err) {
        // non-json response
      }

      if (!res.ok) {
        throw new Error(resData?.message || `Lỗi máy chủ (${res.status}): ${responseText}`);
      }

      if (Array.isArray(resData) && resData.length > 0) {
        setCurrentRecord(resData[0]);
      }

      setMessage({
        type: 'success',
        text: `Đã cập nhật đè số lượng vào bản ghi ID ${TARGET_ID} thành công trên Supabase! Giao diện trang chủ sẽ hiển thị số liệu mới này ngay lập tức.`
      });

      fetchTargetRecord();
    } catch (err: any) {
      console.error('Save fake_distance error:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Lỗi khi gửi dữ liệu lên Supabase',
        details: err.toString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuantity = (Number(val5) || 0) + (Number(val10) || 0) + (Number(val21) || 0) + (Number(val42) || 0);

  // Helper values for distances
  const distances = [
    { key: '5', label: '5 km', val: val5, setVal: setVal5 },
    { key: '10', label: '10 km', val: val10, setVal: setVal10 },
    { key: '21', label: '21 km', val: val21, setVal: setVal21 },
    { key: '42', label: '42 km', val: val42, setVal: setVal42 },
  ];

  // Realtime calculations according to 3 user rules:
  // 1/ Số fake cộng vào Checked-in
  // 2/ Not Checked-in trừ số Fake
  // 3/ Số Total giữ nguyên từ giá trị API trả về không thay đổi
  const previewRows = distances.map(d => {
    const base = baseStats[d.key] || defaultBaseStats[d.key];
    const add = Number(d.val) || 0;
    const feCheckedIn = base.checkedIn + add;
    const feNotCheckedIn = Math.max(0, base.notCheckedIn - add);
    const feTotal = base.total; // Giữ nguyên từ API
    return {
      key: d.key,
      label: d.label,
      baseNotCheckedIn: base.notCheckedIn,
      baseCheckedIn: base.checkedIn,
      baseTotal: base.total,
      add,
      feNotCheckedIn,
      feCheckedIn,
      feTotal,
    };
  });

  const grandBaseChecked = previewRows.reduce((sum, r) => sum + r.baseCheckedIn, 0);
  const grandBaseNot = previewRows.reduce((sum, r) => sum + r.baseNotCheckedIn, 0);
  const grandAdd = previewRows.reduce((sum, r) => sum + r.add, 0);
  const grandFeChecked = previewRows.reduce((sum, r) => sum + r.feCheckedIn, 0);
  const grandFeNot = previewRows.reduce((sum, r) => sum + r.feNotCheckedIn, 0);
  const grandFeTotal = previewRows.reduce((sum, r) => sum + r.baseTotal, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang Check-in</span>
          </button>

          <div className="h-5 w-px bg-slate-700 hidden sm:block"></div>

          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h1 className="font-semibold text-lg text-white">Quản trị Fake Distance (Supabase)</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded font-mono">
              /admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Target ID lock indicator */}
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 border border-amber-500/40 px-3 py-1.5 rounded-lg font-mono">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Khóa mục tiêu: ID {TARGET_ID}</span>
          </div>

          <button
            onClick={refreshAll}
            disabled={isFetching || isLoadingApi}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50 text-xs font-medium cursor-pointer"
            title="Tải lại số liệu từ VnExpress API và Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(isFetching || isLoadingApi) ? 'animate-spin text-indigo-400' : ''}`} />
            <span>Làm mới số liệu</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Status Alert */}
        {message && (
          <div className={`p-4 rounded-xl border flex items-start gap-3 transition-all ${
            message.type === 'success' 
              ? 'bg-emerald-950/50 border-emerald-500/30 text-emerald-200' 
              : 'bg-rose-950/50 border-rose-500/30 text-rose-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-sm">
              <p className="font-medium">{message.text}</p>
              {message.details && (
                <p className="text-xs mt-1 text-slate-400 font-mono bg-black/30 p-2 rounded border border-white/5 overflow-x-auto">
                  {message.details}
                </p>
              )}
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white p-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Input Form Card with Real API Numbers & Realtime Preview */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between pb-4 mb-6 border-b border-slate-700 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-400" />
                  <span>Quy tắc tính toán Fake (Ghi đè ID {TARGET_ID})</span>
                </h2>
              </div>
              <div className="text-xs text-slate-300 mt-1.5 space-y-0.5">
                <p className="text-emerald-400 font-medium">✓ 1. Số Fake sẽ cộng vào <strong>Checked-in</strong>.</p>
                <p className="text-sky-300 font-medium">✓ 2. <strong>Not Checked-in</strong> = Gốc API - Số Fake.</p>
                <p className="text-amber-300 font-medium">✓ 3. <strong>Tổng số (Total)</strong> giữ nguyên không đổi từ giá trị API.</p>
              </div>
            </div>
            
            <div className="text-right bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-700">
              <span className="text-xs text-slate-400 block">Tổng Fake (4 cự ly)</span>
              <span className="text-xl font-bold font-mono text-indigo-400">
                +{totalQuantity.toLocaleString()}
              </span>
              {apiSyncedAt && (
                <span className="text-[10px] text-emerald-400 font-mono block mt-0.5">
                  API: {apiSyncedAt}
                </span>
              )}
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {distances.map((dist) => {
                const base = baseStats[dist.key] || defaultBaseStats[dist.key];
                const add = Number(dist.val) || 0;
                const feCheckedIn = base.checkedIn + add;
                const feNotCheckedIn = Math.max(0, base.notCheckedIn - add);
                const feTotal = base.total;

                return (
                  <div 
                    key={dist.key}
                    className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all shadow-md"
                  >
                    {/* Header */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl font-extrabold text-white">{dist.label}</span>
                        <span className="text-xs font-mono bg-blue-900/50 text-blue-300 px-2 py-0.5 rounded border border-blue-700/50">
                          Cột &quot;{dist.key}&quot;
                        </span>
                      </div>

                      {/* 1. Real API Stats block */}
                      <div className="bg-slate-950/80 rounded-lg p-2.5 mb-3 border border-slate-800 text-xs space-y-1.5">
                        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide flex items-center justify-between pb-1 border-b border-slate-800/80">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Activity className="w-3 h-3 text-sky-400" />
                            <span>Số gốc từ API:</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">VnExpress</span>
                        </div>

                        <div className="flex justify-between items-center text-slate-300 font-mono">
                          <span className="text-slate-400">Checked-in gốc:</span>
                          <span className="text-rose-400 font-bold tabular-nums">
                            {base.checkedIn.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-300 font-mono">
                          <span className="text-slate-400">Not Checked-in gốc:</span>
                          <span className="text-sky-400 font-bold tabular-nums">
                            {base.notCheckedIn.toLocaleString()}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-slate-400 font-mono pt-1 border-t border-slate-800/60 text-[11px]">
                          <span>Tổng số gốc:</span>
                          <span className="text-slate-200 tabular-nums">
                            {base.total.toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* 2. Input to add */}
                      <div className="mb-3">
                        <label className="text-xs font-medium text-amber-300 mb-1.5 flex items-center justify-between">
                          <span>Số Fake:</span>
                          <span className="text-[10px] text-slate-400 font-mono">(Lưu vào ID 6)</span>
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            min="0"
                            value={dist.val}
                            onChange={(e) => dist.setVal(parseInt(e.target.value, 10) || 0)}
                            className="w-full bg-slate-950 border border-indigo-500/60 rounded-lg px-3 py-2 text-white font-mono text-lg font-bold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 shadow-inner"
                            placeholder="0"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-rose-400 pointer-events-none">
                            +{add.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Realtime preview out on FE */}
                    <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-300 uppercase tracking-wide">
                        <Eye className="w-3 h-3 text-emerald-400" />
                        <span>Realtime ngoài FE:</span>
                      </div>

                      <div className="pt-1 flex flex-col gap-1 font-mono">
                        {/* Checked-in FE */}
                        <div className="flex justify-between items-center text-slate-300">
                          <span className="text-slate-400">Checked-in (+):</span>
                          <span className="text-rose-400 font-bold tabular-nums text-sm">
                            {feCheckedIn.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          ({base.checkedIn.toLocaleString()} + {add.toLocaleString()})
                        </div>

                        {/* Not Checked-in FE */}
                        <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-emerald-500/20">
                          <span className="text-slate-400">Not Checked-in (-):</span>
                          <span className="text-sky-300 font-bold tabular-nums text-sm">
                            {feNotCheckedIn.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 text-right">
                          ({base.notCheckedIn.toLocaleString()} - {add.toLocaleString()})
                        </div>

                        {/* Total FE (Giữ nguyên) */}
                        <div className="flex justify-between items-center text-slate-300 pt-1 border-t border-emerald-500/20">
                          <span className="text-slate-400">Total (Giữ nguyên):</span>
                          <span className="text-white font-bold tabular-nums text-sm">
                            {feTotal.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}

            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Mục tiêu ghi đè: <code>fake_distance (id = {TARGET_ID})</code></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVal5(0);
                    setVal10(0);
                    setVal21(0);
                    setVal42(0);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-300 text-sm font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Đặt lại toàn bộ số cộng thêm về 0"
                >
                  <RotateCcw className="w-4 h-4 text-slate-400" />
                  <span>Reset</span>
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Đang lưu đè vào ID {TARGET_ID}...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Lưu đè vào ID {TARGET_ID} trên Supabase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Realtime Live Preview Table for FE */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <span>Bảng mô phỏng kết quả hiển thị ngoài FE (Realtime Live Preview)</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Cập nhật tức thì khi nhập số
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Checked-in được cộng thêm số Fake, Not Checked-in trừ đi số Fake, và Total luôn giữ nguyên bằng đúng số gốc từ API.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
                  <th className="py-3 px-3 font-mono">Cự ly</th>
                  <th className="py-3 px-3 text-slate-400">Checked-in gốc</th>
                  <th className="py-3 px-3 text-amber-300">Số Fake (Admin)</th>
                  <th className="py-3 px-3 text-rose-400 font-bold">👉 Checked-in FE (+)</th>
                  <th className="py-3 px-3 text-sky-400 font-bold">👉 Not Checked-in FE (-)</th>
                  <th className="py-3 px-3 text-right font-bold text-white">Total FE (Giữ nguyên)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50 font-mono">
                {previewRows.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-3 px-3 text-white font-extrabold text-base">{row.label}</td>
                    <td className="py-3 px-3 text-slate-400 tabular-nums">
                      {row.baseCheckedIn.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-amber-300 font-semibold tabular-nums">
                      +{row.add.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-rose-400 font-extrabold text-base tabular-nums">
                      {row.feCheckedIn.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-sky-300 font-extrabold text-base tabular-nums">
                      {row.feNotCheckedIn.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-white font-bold text-base tabular-nums">
                      {row.feTotal.toLocaleString()}
                    </td>
                  </tr>
                ))}

                {/* Total Row */}
                <tr className="bg-slate-900/90 border-t-2 border-indigo-500/50 text-white font-bold">
                  <td className="py-3.5 px-3 text-amber-300 uppercase tracking-wider text-base">Total</td>
                  <td className="py-3.5 px-3 text-slate-400 tabular-nums">
                    {grandBaseChecked.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-amber-300 tabular-nums">
                    +{grandAdd.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-rose-400 text-lg font-black tabular-nums">
                    {grandFeChecked.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-sky-300 text-lg font-black tabular-nums">
                    {grandFeNot.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-3 text-right text-indigo-300 text-lg font-black tabular-nums">
                    {grandFeTotal.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current State in Supabase Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Dữ liệu hiện tại đã lưu trên Supabase (Bản ghi #{TARGET_ID})</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Online
                </span>
              </h3>
            </div>

            <button
              onClick={fetchTargetRecord}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Tải lại</span>
            </button>
          </div>

          {!currentRecord ? (
            <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-700/70 rounded-xl">
              Đang tải dữ liệu từ Supabase...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-xs font-semibold text-slate-400 uppercase">
                    <th className="py-2.5 px-3 font-mono">ID</th>
                    <th className="py-2.5 px-3">5 km (Fake)</th>
                    <th className="py-2.5 px-3">10 km (Fake)</th>
                    <th className="py-2.5 px-3">21 km (Fake)</th>
                    <th className="py-2.5 px-3">42 km (Fake)</th>
                    <th className="py-2.5 px-3 font-mono text-right">Tổng số Fake</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 font-mono">
                  <tr className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 text-amber-300 font-bold">#{currentRecord.id}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{currentRecord['5'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{currentRecord['10'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{currentRecord['21'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">+{currentRecord['42'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-300 font-bold">
                      +{((Number(currentRecord['5']) || 0) + (Number(currentRecord['10']) || 0) + (Number(currentRecord['21']) || 0) + (Number(currentRecord['42']) || 0)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
