import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Save, 
  RefreshCw, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
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
const TARGET_ID = 6;

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
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<FakeDistanceRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchBaseApi = async () => {
    setIsLoadingApi(true);
    try {
      const res = await fetch('/api/racekit-stats');
      if (res.ok) {
        const json = await res.json();
        if (json.baseStats) {
          setBaseStats(json.baseStats);
        }
      }
    } catch (err) {
      console.warn('Lỗi API VnExpress:', err);
    } finally {
      setIsLoadingApi(false);
    }
  };

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
        throw new Error(`HTTP ${res.status}`);
      }

      const data: FakeDistanceRecord[] = await res.json();
      if (data && data.length > 0) {
        const rec = data[0];
        setCurrentRecord(rec);
        if (rec['5'] !== null && rec['5'] !== undefined) setVal5(Number(rec['5']));
        if (rec['10'] !== null && rec['10'] !== undefined) setVal10(Number(rec['10']));
        if (rec['21'] !== null && rec['21'] !== undefined) setVal21(Number(rec['21']));
        if (rec['42'] !== null && rec['42'] !== undefined) setVal42(Number(rec['42']));
      }
    } catch (err: any) {
      console.error('Fetch target record error:', err);
      setMessage({
        type: 'error',
        text: `Lỗi tải Supabase ID ${TARGET_ID}`
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

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
        // non-json
      }

      if (!res.ok) {
        throw new Error(resData?.message || `HTTP ${res.status}`);
      }

      if (Array.isArray(resData) && resData.length > 0) {
        setCurrentRecord(resData[0]);
      }

      setMessage({
        type: 'success',
        text: `Đã lưu thành công vào ID ${TARGET_ID}!`
      });

      fetchTargetRecord();
    } catch (err: any) {
      console.error('Save error:', err);
      setMessage({
        type: 'error',
        text: err.message || 'Lỗi khi lưu Supabase'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const totalQuantity = (Number(val5) || 0) + (Number(val10) || 0) + (Number(val21) || 0) + (Number(val42) || 0);

  const distances = [
    { key: '5', label: '5KM', val: val5, setVal: setVal5 },
    { key: '10', label: '10KM', val: val10, setVal: setVal10 },
    { key: '21', label: '21KM', val: val21, setVal: setVal21 },
    { key: '42', label: '42KM', val: val42, setVal: setVal42 },
  ];

  const previewRows = distances.map(d => {
    const base = baseStats[d.key] || defaultBaseStats[d.key];
    const add = Number(d.val) || 0;
    const feCheckedIn = base.checkedIn + add;
    const feNotCheckedIn = Math.max(0, base.notCheckedIn - add);
    const feTotal = base.total;
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

  const grandFeChecked = previewRows.reduce((sum, r) => sum + r.feCheckedIn, 0);
  const grandFeNot = previewRows.reduce((sum, r) => sum + r.feNotCheckedIn, 0);
  const grandFeTotal = previewRows.reduce((sum, r) => sum + r.baseTotal, 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-20">
      {/* Top Header */}
      <header className="bg-slate-800/95 border-b border-slate-700 px-3 sm:px-6 py-2.5 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs sm:text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Check-in</span>
          </button>
          <div className="h-4 w-px bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <Database className="w-4 h-4 text-indigo-400" />
            <h1 className="font-bold text-sm sm:text-base text-white">Quản trị Fake</h1>
            <span className="text-[11px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-semibold">
              ID #{TARGET_ID}
            </span>
          </div>
        </div>

        <button
          onClick={refreshAll}
          disabled={isFetching || isLoadingApi}
          className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
          title="Tải lại số liệu"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${(isFetching || isLoadingApi) ? 'animate-spin text-indigo-400' : ''}`} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-3 sm:p-5 space-y-3.5">
        
        {/* Status Alert */}
        {message && (
          <div className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs transition-all ${
            message.type === 'success' 
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200' 
              : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium">{message.text}</span>
            </div>
            <button 
              onClick={() => setMessage(null)}
              className="text-slate-400 hover:text-white px-1.5 py-0.5 text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* 4 Compact Distance Input Cards */}
        <div className="space-y-2.5">
          {distances.map((dist) => {
            const base = baseStats[dist.key] || defaultBaseStats[dist.key];
            const add = Number(dist.val) || 0;
            const feCheckedIn = base.checkedIn + add;
            const feNotCheckedIn = Math.max(0, base.notCheckedIn - add);

            return (
              <div 
                key={dist.key}
                className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 shadow-md transition-colors hover:border-slate-600"
              >
                {/* Header Row: Distance & Numeric Input */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-white tracking-tight">{dist.label}</span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Total: <strong className="text-slate-200">{base.total.toLocaleString()}</strong>
                    </span>
                  </div>

                  {/* Input Fake Number */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-amber-300 font-medium">Fake:</span>
                    <div className="relative">
                      <input
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={dist.val}
                        onChange={(e) => dist.setVal(parseInt(e.target.value, 10) || 0)}
                        className="w-24 sm:w-28 bg-slate-950 border border-indigo-500/60 focus:border-indigo-400 rounded-lg px-2.5 py-1.5 text-right font-mono text-base font-bold text-white focus:outline-none focus:ring-1 focus:ring-indigo-400 shadow-inner"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Side-by-side comparison: Gốc API vs Ngoài FE */}
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  {/* Gốc API */}
                  <div className="bg-slate-950/70 rounded-lg px-2.5 py-1.5 border border-slate-800 space-y-0.5">
                    <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                      Gốc API
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 text-[11px]">Checked:</span>
                      <span className="text-rose-400 font-semibold tabular-nums">{base.checkedIn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-slate-400 text-[11px]">Not check:</span>
                      <span className="text-sky-400 font-semibold tabular-nums">{base.notCheckedIn.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Ngoài FE */}
                  <div className="bg-emerald-950/30 rounded-lg px-2.5 py-1.5 border border-emerald-500/30 space-y-0.5">
                    <div className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider">
                      Ngoài FE
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span className="text-slate-400 text-[11px]">Checked (+):</span>
                      <span className="text-rose-400 font-bold tabular-nums">{feCheckedIn.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-slate-200">
                      <span className="text-slate-400 text-[11px]">Not check (-):</span>
                      <span className="text-sky-300 font-bold tabular-nums">{feNotCheckedIn.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compact Realtime Table Summary */}
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-3 shadow-md">
          <div className="flex items-center justify-between mb-2 pb-1 border-b border-slate-700">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Tổng hợp hiển thị FE
            </span>
            <span className="text-xs text-amber-300 font-mono font-semibold">
              Tổng Fake: +{totalQuantity.toLocaleString()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-700/60 text-slate-400 text-[11px]">
                  <th className="py-1 px-1.5">Cự ly</th>
                  <th className="py-1 px-1.5 text-rose-400">Checked (+)</th>
                  <th className="py-1 px-1.5 text-sky-400">Not Check (-)</th>
                  <th className="py-1 px-1.5 text-right text-slate-300">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {previewRows.map((r) => (
                  <tr key={r.key}>
                    <td className="py-1.5 px-1.5 font-bold text-white">{r.label}</td>
                    <td className="py-1.5 px-1.5 text-rose-400 font-bold tabular-nums">{r.feCheckedIn.toLocaleString()}</td>
                    <td className="py-1.5 px-1.5 text-sky-300 font-bold tabular-nums">{r.feNotCheckedIn.toLocaleString()}</td>
                    <td className="py-1.5 px-1.5 text-right text-slate-300 font-semibold tabular-nums">{r.feTotal.toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-slate-900/90 font-bold border-t-2 border-indigo-500/50 text-xs">
                  <td className="py-2 px-1.5 text-amber-300 uppercase">Total</td>
                  <td className="py-2 px-1.5 text-rose-400 font-extrabold tabular-nums">{grandFeChecked.toLocaleString()}</td>
                  <td className="py-2 px-1.5 text-sky-300 font-extrabold tabular-nums">{grandFeNot.toLocaleString()}</td>
                  <td className="py-2 px-1.5 text-right text-indigo-300 font-extrabold tabular-nums">{grandFeTotal.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Current Supabase Status */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 text-xs font-mono">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 text-[11px]">Đã lưu trên Supabase ID #{TARGET_ID}:</span>
            <button 
              onClick={fetchTargetRecord} 
              className="text-indigo-400 hover:text-indigo-300 text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin' : ''}`} />
              <span>Đọc lại</span>
            </button>
          </div>
          {currentRecord ? (
            <div className="grid grid-cols-4 gap-1.5 text-center bg-slate-950/70 p-1.5 rounded-lg border border-slate-800">
              <div><span className="text-slate-500 block text-[10px]">5KM</span><span className="text-emerald-400 font-bold">+{currentRecord['5'] ?? 0}</span></div>
              <div><span className="text-slate-500 block text-[10px]">10KM</span><span className="text-emerald-400 font-bold">+{currentRecord['10'] ?? 0}</span></div>
              <div><span className="text-slate-500 block text-[10px]">21KM</span><span className="text-emerald-400 font-bold">+{currentRecord['21'] ?? 0}</span></div>
              <div><span className="text-slate-500 block text-[10px]">42KM</span><span className="text-emerald-400 font-bold">+{currentRecord['42'] ?? 0}</span></div>
            </div>
          ) : (
            <div className="text-slate-500 text-center py-1">Đang tải...</div>
          )}
        </div>

      </main>

      {/* Sticky Bottom Action Bar (Thumb-friendly on Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-700/90 p-2.5 sm:p-3 backdrop-blur-md z-30 shadow-2xl">
        <div className="max-w-2xl mx-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setVal5(0);
              setVal10(0);
              setVal21(0);
              setVal42(0);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-300 font-semibold text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700 shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>Reset</span>
          </button>

          <button
            onClick={() => handleSave()}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Lưu vào Supabase (ID #{TARGET_ID})</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
