const SUPABASE_URL = 'https://kovcyocsqxqnpnzorsgn.supabase.co/rest/v1/';
const SUPABASE_KEY = 'sb_publishable_wJB7lJtbHit8rlR8yED0Gg_yFk7MEkM';
const VNEXPRESS_API_URL = 'https://vm.vnexpress.net/api/total-racekit?match_id=97&token=968a46e5053895ca9f2adab1a586cf9d';

export default async function handler(req: any, res: any) {
  try {
    // 1. Fetch real API data từ VnExpress
    const apiPromise = fetch(VNEXPRESS_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'Referer': 'https://vm.vnexpress.net/',
        'Accept': 'application/json'
      }
    })
      .then(r => r.ok ? r.json() : null)
      .catch(err => {
        console.error('Lỗi fetch VnExpress API:', err);
        return null;
      });

    // 2. Fetch số fake từ Supabase ID 6
    const supabasePromise = fetch(`${SUPABASE_URL}fake_distance?id=eq.6`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Accept': 'application/json'
      }
    })
      .then(r => r.ok ? r.json() : null)
      .catch(err => {
        console.error('Lỗi fetch Supabase:', err);
        return null;
      });

    const [apiData, supabaseData] = await Promise.all([apiPromise, supabasePromise]);

    const fakeOffsets: Record<string, number> = {
      '5': 0,
      '10': 0,
      '21': 0,
      '42': 0
    };

    if (Array.isArray(supabaseData) && supabaseData.length > 0) {
      const rec = supabaseData[0];
      fakeOffsets['5'] = Number(rec['5']) || 0;
      fakeOffsets['10'] = Number(rec['10']) || 0;
      fakeOffsets['21'] = Number(rec['21']) || 0;
      fakeOffsets['42'] = Number(rec['42']) || 0;
    }

    if (!Array.isArray(apiData) || apiData.length === 0) {
      return res.status(502).json({
        success: false,
        error: 'Không lấy được dữ liệu từ VnExpress API'
      });
    }

    // 3. Tiến hành bóc tách và tính toán theo 3 quy tắc:
    // 1/ Số fake cộng vào Checked-in
    // 2/ Not Checked-in trừ số fake
    // 3/ Số Total giữ nguyên từ giá trị API trả về không thay đổi
    const distanceOrder = ['5', '10', '21', '42'];
    const mapped: Record<string, { distance: string; checkedIn: number; notCheckedIn: number; total: number }> = {};
    const baseStats: Record<string, { distance: string; checkedIn: number; notCheckedIn: number; total: number }> = {};

    apiData.forEach((item: any) => {
      const rawCuLy = String(item['CU LY'] || '').toUpperCase().replace(/[^0-9]/g, '').trim();
      if (rawCuLy) {
        const baseCheckedIn = parseInt(String(item['CHECKIN'] || 0).replace(/,/g, ''), 10) || 0;
        const baseNotCheckedIn = parseInt(String(item['NOT CHECKIN'] || 0).replace(/,/g, ''), 10) || 0;
        const rawTotal = parseInt(String(item['TONG SO'] || 0).replace(/,/g, ''), 10) || (baseCheckedIn + baseNotCheckedIn);
        
        // 1/ Số fake cộng vào Checked-in
        const fakeBonus = Number(fakeOffsets[rawCuLy]) || 0;
        const checkedIn = baseCheckedIn + fakeBonus;

        // 2/ Not Checked-in - số fake
        const notCheckedIn = Math.max(0, baseNotCheckedIn - fakeBonus);

        // 3/ Số Total giữ nguyên từ giá trị API trả về không thay đổi
        const total = rawTotal;

        mapped[rawCuLy] = {
          distance: rawCuLy,
          checkedIn,
          notCheckedIn,
          total
        };

        baseStats[rawCuLy] = {
          distance: rawCuLy,
          checkedIn: baseCheckedIn,
          notCheckedIn: baseNotCheckedIn,
          total: rawTotal
        };
      }
    });

    const list = distanceOrder.map(dist => {
      return mapped[dist] || {
        distance: dist,
        checkedIn: 0,
        notCheckedIn: 0,
        total: 0
      };
    });

    // Tính dòng Total = tổng 4 cự ly cộng lại theo từng trường
    const totalCheckedIn = list.reduce((sum, item) => sum + item.checkedIn, 0);
    const totalNotCheckedIn = list.reduce((sum, item) => sum + item.notCheckedIn, 0);
    const grandTotal = list.reduce((sum, item) => sum + item.total, 0);

    const finalResult = [
      ...list,
      {
        distance: 'Total',
        checkedIn: totalCheckedIn,
        notCheckedIn: totalNotCheckedIn,
        total: grandTotal,
        isTotal: true
      }
    ];

    return res.status(200).json({
      success: true,
      data: finalResult,
      baseStats,
      fakeOffsets,
      updatedAt: new Date().toLocaleTimeString('vi-VN')
    });
  } catch (error: any) {
    console.error('Server error in /api/racekit-stats:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
