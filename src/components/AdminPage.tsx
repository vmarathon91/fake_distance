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
  Layers,
  Sparkles,
  Info
} from 'lucide-react';

interface FakeDistanceRecord {
  id: number;
  '5': number | null;
  '10': number | null;
  '21': number | null;
  '42': number | null;
  [key: string]: any;
}

const SUPABASE_URL = 'https://kovcyocsqxqnpnzorsgn.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_wJB7lJtbHit8rlR8yED0Gg_yFk7MEkM';
const TARGET_ID = 6; // Fixed target ID as requested by user

export default function AdminPage({ onBackToHome }: { onBackToHome: () => void }) {
  const [val5, setVal5] = useState<number>(1446);
  const [val10, setVal10] = useState<number>(1279);
  const [val21, setVal21] = useState<number>(1314);
  const [val42, setVal42] = useState<number>(1048);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [currentRecord, setCurrentRecord] = useState<FakeDistanceRecord | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string; details?: string } | null>(null);

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
        // If not found, fetch all to see what rows exist
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

  useEffect(() => {
    fetchTargetRecord();
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
      // Direct PATCH targeting only ID 6
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
        text: `Đã cập nhật đè số lượng vào bản ghi ID ${TARGET_ID} thành công trên Supabase!`
      });

      // Refresh to ensure sync
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={onBackToHome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-medium transition-colors"
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
            onClick={fetchTargetRecord}
            disabled={isFetching}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50"
            title="Tải lại số liệu ID 6 từ Supabase"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
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

        {/* Input Form Card */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-700">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">
                  Nhập số lượng cự ly (Ghi đè ID {TARGET_ID})
                </h2>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  PATCH fake_distance?id=eq.{TARGET_ID}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Mỗi lần lưu, hệ thống chỉ cập nhật đè trực tiếp vào đúng hàng <strong className="text-amber-300">ID #{TARGET_ID}</strong> trên bảng <code>fake_distance</code>.
              </p>
            </div>
            
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Tổng số lượng</span>
              <span className="text-xl font-bold font-mono text-indigo-400">
                {totalQuantity.toLocaleString()}
              </span>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Distance 5km */}
              <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cự ly</span>
                  <span className="text-xs font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    Cột: &quot;5&quot;
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white mb-3">5 km</div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Số lượng:</label>
                  <input
                    type="number"
                    min="0"
                    value={val5}
                    onChange={(e) => setVal5(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-lg font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Distance 10km */}
              <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cự ly</span>
                  <span className="text-xs font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    Cột: &quot;10&quot;
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white mb-3">10 km</div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Số lượng:</label>
                  <input
                    type="number"
                    min="0"
                    value={val10}
                    onChange={(e) => setVal10(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-lg font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Distance 21km */}
              <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cự ly</span>
                  <span className="text-xs font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    Cột: &quot;21&quot;
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white mb-3">21 km</div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Số lượng:</label>
                  <input
                    type="number"
                    min="0"
                    value={val21}
                    onChange={(e) => setVal21(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-lg font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Distance 42km */}
              <div className="bg-slate-900/90 border border-slate-700/70 rounded-xl p-4 flex flex-col justify-between hover:border-slate-600 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cự ly</span>
                  <span className="text-xs font-mono bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40">
                    Cột: &quot;42&quot;
                  </span>
                </div>
                <div className="text-3xl font-extrabold text-white mb-3">42 km</div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block">Số lượng:</label>
                  <input
                    type="number"
                    min="0"
                    value={val42}
                    onChange={(e) => setVal42(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-lg font-semibold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="0"
                  />
                </div>
              </div>

            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-700">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Server className="w-3.5 h-3.5 text-slate-500" />
                <span>Mục tiêu cố định: <code>fake_distance (id = {TARGET_ID})</code></span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setVal5(1446);
                    setVal10(1279);
                    setVal21(1314);
                    setVal42(1048);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-medium transition-colors"
                >
                  Khôi phục số mẫu
                </button>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
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

        {/* Current State in Supabase Table */}
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Dữ liệu hiện tại trên Supabase của bản ghi #{TARGET_ID}</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono">
                  Trực tuyến
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
                    <th className="py-2.5 px-3">5 km</th>
                    <th className="py-2.5 px-3">10 km</th>
                    <th className="py-2.5 px-3">21 km</th>
                    <th className="py-2.5 px-3">42 km</th>
                    <th className="py-2.5 px-3 font-mono text-right">Tổng cộng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50 font-mono">
                  <tr className="hover:bg-slate-750/50 transition-colors">
                    <td className="py-2.5 px-3 text-amber-300 font-bold">#{currentRecord.id}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{currentRecord['5'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{currentRecord['10'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{currentRecord['21'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-emerald-400 font-bold">{currentRecord['42'] ?? '-'}</td>
                    <td className="py-2.5 px-3 text-right text-indigo-300 font-bold">
                      {((Number(currentRecord['5']) || 0) + (Number(currentRecord['10']) || 0) + (Number(currentRecord['21']) || 0) + (Number(currentRecord['42']) || 0)).toLocaleString()}
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
