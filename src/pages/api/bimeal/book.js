import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const PENDING_STATUS_ID = 1;

const toMysqlDatetime = (d) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((x) => {
      const item = (typeof x === 'string' ? x : x?.item) ?? '';
      const qtyNum = Number((typeof x === 'string' ? 1 : x?.qty) ?? 1);
      const qty = Number.isFinite(qtyNum) ? Math.max(1, Math.min(999, qtyNum)) : 1;
      const unit = (typeof x === 'string' ? 'pcs' : x?.unit) || 'pcs';
      return { item: String(item).trim(), qty, unit };
    })
    .filter((r) => r.item.length > 0);
}

export default async function handler(req, res) {
  // ===== GET =====
  if (req.method === 'GET') {
    const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
    const auth = isAdminScope
      ? await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin')
      : await verifyAuth(req, ['user'], 'user');

    if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

    const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
    const listForUserId =
      isAdminScope && Number.isFinite(requestedUserId) && requestedUserId > 0
        ? requestedUserId
        : !isAdminScope
        ? auth.userId
        : null;

    let conn;
    try {
      conn = await db.getConnection();
      let rows;
      if (listForUserId) {
        [rows] = await conn.query(
          `SELECT b.id, b.user_id, b.nama_pic, b.nama_pic_tagihan, b.no_wa_pic,
                  b.unit_kerja_id, u.unit_kerja AS unit_kerja,
                  b.waktu_pesanan, b.keterangan, b.lokasi_pengiriman,
                  b.status_id, b.created_at
          FROM bimeal_bookings b
          LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC`,
          [listForUserId]
        );
      } else {
        [rows] = await conn.query(
          `SELECT b.id, b.user_id, b.nama_pic, b.nama_pic_tagihan, b.no_wa_pic,
                  b.unit_kerja_id, u.unit_kerja AS unit_kerja,
                  b.waktu_pesanan, b.keterangan, b.lokasi_pengiriman,
                  b.status_id, b.created_at
          FROM bimeal_bookings b
          LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
          ORDER BY b.created_at DESC`
        );
      }


      const bookings = Array.isArray(rows) ? rows : [];
      if (!bookings.length) {
        conn?.release();
        return res.status(200).json([]);
      }

      const ids = bookings.map((r) => r.id);
      const [items] = await conn.query(
        `SELECT i.booking_id, i.nama_pesanan, i.jumlah, i.satuan
         FROM bimeal_booking_items i
         WHERE i.booking_id IN (?)`,
        [ids]
      );

      const itemsMap = {};
      for (const it of items) {
        (itemsMap[it.booking_id] ||= []).push({
          item: it.nama_pesanan,
          qty: it.jumlah,
          unit: it.satuan || 'pcs',
        });
      }

      const result = bookings.map((b) => ({ ...b, items: itemsMap[b.id] || [] }));
      conn?.release();
      return res.status(200).json(result);
    } catch (e) {
      conn?.release();
      console.error('GET /api/bimeal/book error:', e.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e.message });
    }
  }

  // ===== POST =====
  if (req.method === 'POST') {
    const auth = await verifyAuth(req, ['user'], 'user');
    if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

    let body = {};
    try {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch {
      return res.status(400).json({ error: 'Body harus JSON' });
    }

    const nama_pic = String(body?.nama_pic || '').trim();
    const nama_pic_tagihan = String(body?.nama_pic_tagihan || '').trim();
    const wa = String(body?.wa || '').trim();
    const unit_kerja_id = Number(body?.unit_kerja_id) || null;
    const tgl = body?.tgl ? new Date(body.tgl) : null;
    const pesanan = normalizeItems(body?.pesanan);
    const lokasi = String(body?.lokasi || '').trim();
    const ket = String(body?.ket || '').trim();

    // === VALIDASI ===
    if (
      !nama_pic ||
      !nama_pic_tagihan ||
      !wa ||
      !unit_kerja_id ||
      !tgl ||
      Number.isNaN(tgl.getTime()) ||
      !lokasi ||
      !ket ||
      !pesanan.length
    ) {
      return res.status(422).json({ error: 'VALIDATION_ERROR' });
    }

    const waktu_pesanan = toMysqlDatetime(tgl);

    let conn;
    try {
      conn = await db.getConnection();
      await conn.beginTransaction();

      const [result] = await conn.query(
        `INSERT INTO bimeal_bookings
           (user_id, nama_pic, nama_pic_tagihan, no_wa_pic, unit_kerja_id,
            waktu_pesanan, status_id, keterangan, lokasi_pengiriman)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          auth.userId,
          nama_pic,
          nama_pic_tagihan,
          wa,
          unit_kerja_id,
          waktu_pesanan,
          PENDING_STATUS_ID,
          ket,
          lokasi,
        ]
      );
      const bookingId = result.insertId;

      if (pesanan.length) {
        const values = pesanan.map((p) => [bookingId, p.item, p.qty, p.unit]);
        await conn.query(
          `INSERT INTO bimeal_booking_items (booking_id, nama_pesanan, jumlah, satuan) VALUES ?`,
          [values]
        );
      }

      await conn.commit();
      return res
        .status(201)
        .json({ ok: true, booking_id: bookingId, status_id: PENDING_STATUS_ID });
    } catch (e) {
      if (conn) await conn.rollback();
      console.error('POST /api/bimeal/book error:', e.message);
      return res.status(500).json({ error: 'INTERNAL_ERROR', details: e.message });
    } finally {
      conn?.release();
    }
  }

  if (req.method === 'PUT') {
    try {
      const isAdminScope = String(req.query?.scope || '').toLowerCase() === 'admin';
      const auth = isAdminScope
        ? await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin')
        : await verifyAuth(req, ['user'], 'user');
      if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

      const { bookingId, newStatusId } = req.body || {};
      const id = Number(bookingId);
      const statusId = Number(newStatusId);

      if (!id || ![1,2,3,4].includes(statusId)) {
        return res.status(400).json({error: 'VALIDATION_ERROR', reason: 'Input tidak valid'});
      }
      const [rows] = await db.query('SELECT user_id FROM bimeal_bookings WHERE id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'NOT_FOUND', reason: 'Booking tidak ditemukan' });

      const isOwner = String(rows[0].user_id) === String(auth.userId);
      if (auth.role === 'user' && !isOwner) {
        return res.status(403).json({ error: 'FORBIDDEN', reason: 'Bukan pemilik booking' });
      }
      await db.query('UPDATE bimeal_bookings SET status_id=?, updated_at=NOW() WHERE id=?', [statusId, id]);
      return res.status(200).json({ ok: true });
    } catch (e) {
      console.error('PUT /api/bimeal/book error:', e);
      return res.status(500).json({ error: 'INTERNAL_ERROR', reason: e?.message });
    }
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
