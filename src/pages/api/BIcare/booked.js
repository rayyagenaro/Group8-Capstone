// /pages/api/BIcare/booked.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/* ===================== utils ===================== */
const pad2 = (n) => String(n).padStart(2, '0');

const ymd = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// pastikan SEMUA key tanggal bentuknya "YYYY-MM-DD"
const toDateKey = (val) => {
  if (!val) return '';
  if (val instanceof Date) return ymd(val);
  const s = String(val);
  // "2025-08-29" atau "2025-08-29T00:00:00.000Z"
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  // fallback ke Date parser bila MySQL driver ngasih "Fri Aug 29 2025 ..."
  const d = new Date(s);
  return isNaN(d) ? s : ymd(d);
};

const toHHMM = (timeLike) => {
  if (!timeLike) return '';
  if (typeof timeLike === 'string') return timeLike.slice(0, 5);
  if (timeLike instanceof Date) {
    const h = pad2(timeLike.getUTCHours());
    const m = pad2(timeLike.getUTCMinutes());
    return `${h}:${m}`;
  }
  return String(timeLike).slice(0, 5);
};

function* slotsBetween(startStr, endStr, stepMin) {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  for (let m = startMin; m < endMin; m += stepMin) {
    yield `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;
  }
}

const monthRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0);
  return { first, last, firstStr: ymd(first), lastStr: ymd(last) };
};

// ENUM -> angka 1..7 (Sen=1, ... Min=7)
const DAY_ENUM_TO_NUM = { MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6, SUN: 7 };

/* ===================== handler ===================== */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const auth = await verifyAuth(req, ['user', 'admin']);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }

  try {
    const doctorId = Number(req.query.doctorId || 0);
    const monthStr = String(req.query.month || '').trim(); // "YYYY-MM"
    if (!doctorId || !/^\d{4}-\d{2}$/.test(monthStr)) {
      return res.status(400).json({ error: 'Bad request', details: 'doctorId & month=YYYY-MM wajib' });
    }

    const { first, last, firstStr, lastStr } = monthRange(monthStr);

    /* ---------- 1) RULES dari bicare_availability_rules ---------- */
    let rules = [];
    try {
      const [rows] = await db.query(
        `SELECT doctor_id, weekday, start_time, end_time, slot_minutes
         FROM bicare_availability_rules
         WHERE doctor_id = ? AND is_active = 1`,
        [doctorId]
      );
      rules = (rows || [])
        .map((r) => ({
          weekdayNum: DAY_ENUM_TO_NUM[String(r.weekday)],
          start: typeof r.start_time === 'string' ? r.start_time : '00:00:00',
          end: typeof r.end_time === 'string' ? r.end_time : '00:00:00',
          step: Number(r.slot_minutes) || 30,
        }))
        .filter((r) => r.weekdayNum && r.start !== r.end);
    } catch (e) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('[BIcare] Tabel bicare_availability_rules belum ada.');
        rules = [];
      } else {
        console.error('[BIcare] Query availability rules gagal:', e);
        throw e;
      }
    }

    /* ---------- 2) ADMIN BLOCKS (opsional, tabel terpisah) ---------- */
    const blocksRanges = [];

    /* ---------- 3) BOOKINGS (pisahkan ADMIN_BLOCK & user booking) ---------- */
    let bookings = [];
    try {
      const [rows] = await db.query(
        `SELECT id, user_id, doctor_id, booking_date, slot_time, status,
                booker_name, nip, wa, patient_name, patient_status, gender, birth_date, complaint, created_at
         FROM bicare_bookings
         WHERE doctor_id = ?
           AND booking_date BETWEEN ? AND ?`,
        [doctorId, firstStr, lastStr]
      );
      bookings = rows || [];
    } catch (e) {
      if (e?.code === 'ER_NO_SUCH_TABLE') {
        console.warn('[BIcare] Tabel bicare_bookings belum ada — lanjut tanpa booking.');
        bookings = [];
      } else {
        console.error('[BIcare] Query bookings gagal:', e);
        throw e;
      }
    }

    const bookedMapSet = {};
    const adminBlocksFromBookings = {};

    for (const r of bookings) {
      const dateKey = toDateKey(r.booking_date);   // <<< FIX penting
      const timeHHMM = toHHMM(r.slot_time);

      const isAdminBlock =
        String(r.booker_name || '').toUpperCase() === 'ADMIN_BLOCK' ||
        (r.user_id == null && String(r.nip || '-') === '-' && String(r.wa || '-') === '-');

      if (isAdminBlock) {
        if (!adminBlocksFromBookings[dateKey]) adminBlocksFromBookings[dateKey] = new Set();
        adminBlocksFromBookings[dateKey].add(timeHHMM);
        continue;
      }

      const statusNorm = String(r.status || 'Booked').trim();
      const isActive = statusNorm.toLowerCase() !== 'cancelled';
      if (!isActive) continue;

      if (!bookedMapSet[dateKey]) bookedMapSet[dateKey] = new Set();
      bookedMapSet[dateKey].add(timeHHMM);
    }

    /* ---------- 4) slotMap dari rules ---------- */
    const slotMap = {};
    if (rules.length) {
      for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
        const key = ymd(d);
        const jsW = d.getDay(); // 0..6; 0=Sun
        const wk = jsW === 0 ? 7 : jsW; // 1..7; 1=Mon
        const dayRules = rules.filter((r) => r.weekdayNum === wk);
        if (!dayRules.length) continue;

        const set = new Set();
        for (const r of dayRules) {
          for (const s of slotsBetween(r.start, r.end, r.step)) set.add(s);
        }
        if (set.size) slotMap[key] = Array.from(set).sort();
      }
    }

    /* ---------- 5) adminBlocks akhir ---------- */
    const adminBlocks = {};
    // (a) dari tabel ranges (jika ada)
    if (blocksRanges.length && Object.keys(slotMap).length) {
      for (const [dateKey, slots] of Object.entries(slotMap)) {
        const ranges = blocksRanges.filter((b) => toDateKey(b.block_date) === dateKey); // <<< FIX
        if (!ranges.length) continue;
        const blocked = new Set();
        for (const hhmm of slots) {
          const hms = `${hhmm}:00`;
          for (const rg of ranges) {
            const start = typeof rg.time_start === 'string' ? rg.time_start : '00:00:00';
            const end = typeof rg.time_end === 'string' ? rg.time_end : '00:00:00';
            if (hms >= start && hms < end) {
              blocked.add(hhmm);
              break;
            }
          }
        }
        if (blocked.size) adminBlocks[dateKey] = Array.from(blocked).sort();
      }
    }
    // (b) union dengan ADMIN_BLOCK yang disimpan di bookings
    for (const [dateKey, setFromBookings] of Object.entries(adminBlocksFromBookings)) {
      const list = Array.from(setFromBookings).sort();
      if (adminBlocks[dateKey]) {
        const s = new Set([...adminBlocks[dateKey], ...list]);
        adminBlocks[dateKey] = Array.from(s).sort();
      } else {
        adminBlocks[dateKey] = list;
      }
    }

    const bookedMap = Object.fromEntries(
      Object.entries(bookedMapSet).map(([k, v]) => [k, Array.from(v).sort()])
    );

    return res.status(200).json({
      ok: true,
      ns: auth.ns,
      slotMap,
      bookedMap,
      adminBlocks,
    });
  } catch (e) {
    console.error('Error in GET /api/BIcare/booked:', e?.message, e);
    return res.status(500).json({ error: 'Internal server error', details: e?.message });
  }
}
