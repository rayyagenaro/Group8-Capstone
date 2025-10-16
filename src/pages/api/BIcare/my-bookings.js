// /pages/api/BIcare/my-bookings.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const scope = String(req.query.scope || 'user').toLowerCase(); // 'user' | 'admin'

  // role yang diizinkan tergantung scope
  const auth = await verifyAuth(req, scope === 'admin' ? ['admin'] : ['user'], scope);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

  try {
    let rows = [];
    if (scope === 'admin') {
      // ADMIN: semua booking BI.Care
      const [r] = await db.query(
        `SELECT b.*, d.name AS doctor_name
         FROM bicare_bookings b
         LEFT JOIN bicare_doctors d ON d.id = b.doctor_id
         ORDER BY b.booking_date DESC, b.slot_time DESC
         LIMIT 1000`
      );
      rows = r || [];
    } else {
      // USER: hanya booking milik user
      const userId =
        Number(auth?.userId) ||
        Number(auth?.user?.id) ||
        Number(auth?.payload?.sub);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized', reason: 'no user id' });
      }

      const [r] = await db.query(
        `SELECT b.*, d.name AS doctor_name
         FROM bicare_bookings b
         LEFT JOIN bicare_doctors d ON d.id = b.doctor_id
         WHERE b.user_id = ?
         ORDER BY b.booking_date DESC, b.slot_time DESC
         LIMIT 500`,
        [userId]
      );
      rows = r || [];
    }

    return res.status(200).json({ ok: true, bookings: rows });
  } catch (e) {
    console.error('[BIcare] my-bookings error:', e);
    return res.status(500).json({ error: 'Internal server error', detail: e.message });
  }
}
