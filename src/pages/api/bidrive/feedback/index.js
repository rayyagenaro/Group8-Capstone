// /pages/api/bidrive/feedback/index.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const asInt = (v) => {
  const n = Number.parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : NaN;
};

const safeParseJSON = (val) => {
  if (val == null) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
};

export default async function handler(req, res) {
  // Coba autentikasi sebagai user dulu; kalau gagal, coba admin
  let auth = await verifyAuth(req, ['user'], 'user');
  let isUser = auth?.ok === true;
  if (!isUser) {
    const adminAuth = await verifyAuth(req, ['admin_fitur', 'super_admin'], 'admin');
    if (!adminAuth?.ok) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    auth = adminAuth; // admin
  }

  if (req.method === 'GET') {
    // GET /api/bidrive/feedback?bookingId=52
    const bookingId = asInt(req.query.bookingId);
    if (!Number.isFinite(bookingId)) {
      return res.status(400).json({ error: 'bookingId tidak valid' });
    }

    // Kalau user, batasi hanya boleh lihat feedback miliknya
    const params = [bookingId];
    let whereOwner = '';
    if (auth.scope === 'user') {
      whereOwner = ' AND b.user_id = ?';
      params.push(Number(auth.userId));
    }

    const [rows] = await db.query(
      `SELECT f.id, f.booking_id, f.user_id, f.rating_overall,
              f.tags_json, f.comment_text, f.created_at, f.updated_at
         FROM bidrive_feedback f
         JOIN bidrive_bookings b ON b.id = f.booking_id
        WHERE f.booking_id = ? ${whereOwner}
        LIMIT 1`,
      params
    );

    if (!rows.length) {
      return res.status(200).json({ item: null });
    }

    const item = rows[0];
    const tags = safeParseJSON(item.tags_json);
    return res.status(200).json({
      item: {
        ...item,
        tags,             // array siap pakai di FE
        tags_json: tags,  // kompatibel
      }
    });
  }

  if (req.method === 'POST') {
    // body: { bookingId, rating_overall, tags?, comment_text? }
    const { bookingId, rating_overall, tags, comment_text } = req.body || {};

    const bid = asInt(bookingId);
    const rating = asInt(rating_overall);

    if (!Number.isFinite(bid)) {
      return res.status(400).json({ error: 'bookingId tidak valid' });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating_overall harus 1..5' });
    }

    // Ambil booking untuk validasi kepemilikan & status
    const [[booking]] = await db.query(
      'SELECT id, user_id, status_id FROM bidrive_bookings WHERE id = ? LIMIT 1',
      [bid]
    );
    if (!booking) return res.status(404).json({ error: 'Booking tidak ditemukan' });

    // User hanya boleh memberi feedback utk booking miliknya
    if (auth.scope === 'user' && Number(booking.user_id) !== Number(auth.userId)) {
      return res.status(403).json({ error: 'Forbidden: bukan pemilik booking' });
    }

    // Disarankan hanya ketika finished (status_id = 4)
    if (Number(booking.status_id) !== 4) {
      return res.status(400).json({ error: 'Feedback hanya dapat dikirim setelah booking selesai.' });
    }

    const tagArray = Array.isArray(tags) ? tags.slice(0, 12) : [];
    const tagsJsonStr = JSON.stringify(tagArray || []);
    const comment = (comment_text || '').toString();

    // Upsert by UNIQUE(booking_id)
    await db.query(
      `INSERT INTO bidrive_feedback
         (booking_id, user_id, rating_overall, tags_json, comment_text, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         rating_overall = VALUES(rating_overall),
         tags_json      = VALUES(tags_json),
         comment_text   = VALUES(comment_text),
         updated_at     = NOW()`,
      [bid, booking.user_id, rating, tagsJsonStr, comment]
    );

    return res.status(201).json({
      ok: true,
      item: {
        booking_id: bid,
        user_id: booking.user_id,
        rating_overall: rating,
        tags: tagArray,
        comment_text: comment,
      }
    });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}