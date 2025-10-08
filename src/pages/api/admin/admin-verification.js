// pages/api/admin-verification.js
import db from '@/lib/db';

const STATUS = { PENDING: 1, VERIFIED: 2, REJECTED: 3 };
const ALLOW_4_DOMAINS = new Set(['umi.com']); // domain spesial

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { adminId, action, reason } = req.body || {};
  const aid = Number(adminId);

  if (!aid || !action) {
    return res.status(400).json({ error: 'adminId dan action wajib diisi.' });
  }
  if (!['verify', 'reject'].includes(action)) {
    return res.status(400).json({ error: 'action harus "verify" atau "reject".' });
  }
  if (action === 'reject' && !String(reason || '').trim()) {
    return res.status(400).json({ error: 'Alasan penolakan wajib diisi untuk aksi reject.' });
  }

  const conn = (await db.getConnection?.()) || db;

  try {
    if (conn.beginTransaction) await conn.beginTransaction();

    // ambil admin
    const [rows] = await conn.query(
      'SELECT id, role_id, verification_id, email FROM admins WHERE id = ? LIMIT 1',
      [aid]
    );
    if (!rows.length) {
      if (conn.rollback) await conn.rollback();
      return res.status(404).json({ error: 'Admin tidak ditemukan.' });
    }
    const admin = rows[0];

    // cegah double final
    if (admin.verification_id === STATUS.VERIFIED && action === 'verify') {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Admin sudah diverifikasi sebelumnya.' });
    }
    if (admin.verification_id === STATUS.REJECTED && action === 'reject') {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Admin sudah ditolak sebelumnya.' });
    }

    // hanya admin fitur
    if (Number(admin.role_id) !== 2) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({
        error: 'Hanya admin fitur (role_id = 2) yang bisa diverifikasi/ditolak lewat endpoint ini.',
      });
    }

    if (action === 'reject') {
      const reasonText = String(reason || '').trim();
      await conn.query(
        'UPDATE admins SET verification_id = ?, rejection_reason = ? WHERE id = ?',
        [STATUS.REJECTED, reasonText, aid]
      );
      if (conn.commit) await conn.commit();
      return res.status(200).json({
        ok: true,
        message: 'Admin ditolak.',
        verification_id: STATUS.REJECTED,
        rejection_reason: reasonText,
      });
    }

    // ===== VERIFY =====
    // domain → tentukan batas
    const domain = String(admin.email || '').split('@')[1]?.toLowerCase() || '';
    const maxAllowed = ALLOW_4_DOMAINS.has(domain) ? 4 : 2;

    // hitung mapping layanan
    const [svcRows] = await conn.query(
      `SELECT COUNT(*) AS c
       FROM admin_services
       WHERE admin_id = ?`,
      [aid]
    );
    const count = Number(svcRows?.[0]?.c || 0);

    if (count < 1 || count > maxAllowed) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({
        error: `Admin harus memiliki 1–${maxAllowed} layanan di admin_services sebelum diverifikasi.`,
      });
    }

    await conn.query(
      'UPDATE admins SET verification_id = ?, rejection_reason = NULL WHERE id = ?',
      [STATUS.VERIFIED, aid]
    );

    if (conn.commit) await conn.commit();
    return res.status(200).json({
      ok: true,
      message: 'Admin berhasil diverifikasi.',
      verification_id: STATUS.VERIFIED,
      maxAllowed,
      domain,
    });
  } catch (err) {
    if (conn.rollback) await conn.rollback();
    console.error('admin-verification error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  } finally {
    if (conn.release) conn.release();
  }
}
