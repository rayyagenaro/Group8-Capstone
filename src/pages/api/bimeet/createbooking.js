import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

function toSqlDateTime(isoOrDate) {
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default async function handler(req, res) {
  /* ===================== GET ===================== */
  if (req.method === 'GET') {
    try {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');

      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
      const listForUserId =
        isAdminScope && Number.isFinite(requestedUserId) && requestedUserId > 0
          ? requestedUserId
          : !isAdminScope
          ? auth.userId
          : null;

      const statusMap = { pending: 1, approved: 2, rejected: 3, finished: 4 };
      const statusKey = String(req.query.status || '').toLowerCase();
      const statusId = statusMap[statusKey] ?? null;
      const bookingId = req.query.bookingId ? Number(req.query.bookingId) : null;

      const params = [];
      const where = [];

      if (listForUserId) {
        where.push('b.user_id = ?');
        params.push(listForUserId);
      }
      if (statusId) {
        where.push('b.status_id = ?');
        params.push(statusId);
      }
      if (bookingId) {
        where.push('b.id = ?');
        params.push(bookingId);
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const [rows] = await db.query(
        `
        SELECT
          b.id,
          b.user_id,
          b.room_id,
          r.name AS room_name,
          r.capacity AS room_capacity,
          b.unit_kerja_id,
          u.unit_kerja AS unit_kerja,
          b.title,
          b.description,
          b.start_datetime AS start_date,
          b.end_datetime AS end_date,
          b.participants,
          b.contact_phone,
          b.pic_name,
          b.status_id,
          b.created_at,
          b.updated_at
        FROM bimeet_bookings b
        LEFT JOIN bimeet_rooms r ON r.id = b.room_id
        LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
        ${whereSQL}
        ORDER BY b.start_datetime DESC
        `,
        params
      );


      if (bookingId) {
        return res.status(200).json({ item: rows[0] || null });
      }
      return res.status(200).json({ items: rows });
    } catch (e) {
      console.error('GET /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', reason: e?.message });
    }
  }

  /* ===================== POST ===================== */
  if (req.method === 'POST') {
    try {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin','admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');

      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      // 🔐 user biasa: pakai id dari token, admin: boleh override body.user_id
      const userId = !isAdminScope ? auth.userId : (req.body?.user_id || auth.userId);

      const {
        room_id, unit_kerja_id, title, description,
        start_date, end_date, participants,
        contact_phone, pic_name
      } = req.body || {};

      // validasi field wajib
      const miss = [];
      if (!room_id) miss.push('room_id');
      if (!unit_kerja_id) miss.push('unit_kerja_id');
      if (!title) miss.push('title');
      if (!start_date) miss.push('start_date');
      if (!end_date) miss.push('end_date');
      if (!participants) miss.push('participants');
      if (!contact_phone) miss.push('contact_phone');
      if (!pic_name) miss.push('pic_name');
      if (miss.length) return res.status(400).json({ error: 'VALIDATION_ERROR', fields: miss });

      const start = new Date(start_date);
      const end = new Date(end_date);
      if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', reason: 'Rentang waktu tidak valid' });
      }

      const participantsNum = parseInt(participants, 10);
      if (!participantsNum || participantsNum <= 0) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', reason: 'participants harus angka > 0' });
      }

      const [rooms] = await db.query('SELECT capacity FROM bimeet_rooms WHERE id=?', [room_id]);
      if (!rooms.length) return res.status(404).json({ error: 'NOT_FOUND', reason: 'Ruangan tidak ditemukan' });

      // cek bentrok booking
      const [conflict] = await db.query(
        `SELECT id FROM bimeet_bookings
         WHERE room_id=? AND status_id=2
         AND NOT (end_datetime <= ? OR start_datetime >= ?)
         LIMIT 1`,
        [room_id, toSqlDateTime(start), toSqlDateTime(end)]
      );
      if (conflict.length) {
        return res.status(409).json({ error: 'CONFLICT', reason: 'Jadwal bentrok dengan pemakaian lain' });
      }

      const [result] = await db.query(
        `INSERT INTO bimeet_bookings
        (user_id, room_id, unit_kerja_id, title, description,
        start_datetime, end_datetime, participants, contact_phone, pic_name,
        status_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
        [userId, room_id, unit_kerja_id, title, description || null,
         toSqlDateTime(start), toSqlDateTime(end),
         participantsNum, contact_phone, pic_name]
      );

      return res.status(201).json({ ok: true, id: result.insertId, status_id: 1 });
    } catch (e) {
      console.error('POST /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', reason: e?.message });
    }
  }

  /* ===================== PUT ===================== */
  if (req.method === 'PUT') {
    try {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin','admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');

      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });

      const { bookingId, newStatusId } = req.body || {};
      const id = Number(bookingId);
      const statusId = Number(newStatusId);

      if (!id || ![1,2,3,4].includes(statusId)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', reason: 'Input tidak valid' });
      }

      const [rows] = await db.query('SELECT user_id FROM bimeet_bookings WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND', reason: 'Booking tidak ditemukan' });

      const isOwner = String(rows[0].user_id) === String(auth.userId);
      if (auth.role === 'user' && !isOwner) {
        return res.status(403).json({ error: 'FORBIDDEN', reason: 'Booking bukan milik Anda' });
      }

      await db.query('UPDATE bimeet_bookings SET status_id=?, updated_at=NOW() WHERE id=?', [statusId, id]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('PUT /api/bimeet/createbooking error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', reason: e?.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
