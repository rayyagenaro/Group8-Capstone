// src/pages/api/BIstaybook/availability.js
import db from '@/lib/db';

/**
 * Mapping ID status di tabel kamu.
 * UBAH angkanya kalau berbeda dengan skema kamu:
 *   1 = pending
 *   2 = approved
 *   3 = rejected
 *   4 = cancelled
 */
const STATUS_ID_FOR = {
  pending: 1,
  approved: 2, // <-- SESUAIKAN kalau ID 'approved' kamu bukan 2
  rejected: 3,
  finished: 4,
};

function pad(n) { return String(n).padStart(2, '0'); }
function toMySQLLocal(d) {
  // Format ke "YYYY-MM-DD HH:MM:SS" pakai zona waktu server (konsisten dengan API kamu yang lain)
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const HH = pad(d.getHours());
  const MM = pad(d.getMinutes());
  const SS = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${HH}:${MM}:${SS}`;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { year, month, status, status_id } = req.query || {};

    if (!year || !month) {
      return res.status(400).json({ error: 'year & month wajib diisi. Contoh: ?year=2025&month=08' });
    }

    const y = Number(year);
    const m0 = Number(month) - 1; // 0-based
    if (!Number.isFinite(y) || !Number.isFinite(m0) || m0 < 0 || m0 > 11) {
      return res.status(400).json({ error: 'Parameter year/month tidak valid' });
    }

    // Range bulan (lokal) — konsisten dengan helper toMySQLDateTime di API kamu
    const monthStart = new Date(y, m0, 1, 0, 0, 0, 0);
    const monthEndExcl = new Date(y, m0 + 1, 1, 0, 0, 0, 0); // exclusive

    // Tentukan status yang diambil (default: approved saja)
    let statusFilterId;
    if (status_id != null) {
      const sid = Number(status_id);
      statusFilterId = Number.isFinite(sid) ? sid : STATUS_ID_FOR.approved;
    } else if (status) {
      const key = String(status).toLowerCase();
      statusFilterId = STATUS_ID_FOR[key] ?? STATUS_ID_FOR.approved;
    } else {
      statusFilterId = STATUS_ID_FOR.approved;
    }

    // Overlap rule:
    //   booking mengenai bulan ini jika
    //     check_in < monthEndExcl  AND  check_out > monthStart
    const sql = `
      SELECT b.check_in, b.check_out, b.status_id
      FROM bistay_bookings b
      WHERE
        b.status_id = ?
        AND b.check_in < ?
        AND b.check_out > ?
      ORDER BY b.check_in ASC
    `;
    const params = [statusFilterId, toMySQLLocal(monthEndExcl), toMySQLLocal(monthStart)];
    const [rows] = await db.execute(sql, params);

    // Bentuk respons yang diharapkan UI:
    // [{ check_in: ISOString, check_out: ISOString, status: 'approved' }]
    const statusNameById = Object.fromEntries(
      Object.entries(STATUS_ID_FOR).map(([name, id]) => [id, name])
    );

    const data = (rows || []).map((r) => ({
      check_in: new Date(r.check_in).toISOString(),
      check_out: new Date(r.check_out).toISOString(),
      status: statusNameById[r.status_id] || String(r.status_id),
    }));

    return res.status(200).json(data);
  } catch (err) {
    console.error('GET /api/BIstaybook/availability error:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
