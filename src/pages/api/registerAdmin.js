// /src/pages/api/registerAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function isValidPhone(raw) {
  if (!raw) return false;
  const s = String(raw).replace(/[^\d+]/g, '');
  return /^(?:\+?62|0)\d{7,13}$/.test(s);
}

function getEmailDomain(email = '') {
  const at = String(email).trim().toLowerCase().split('@');
  return at.length === 2 ? at[1] : '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  // role_id DIHARDCODE = 2 (admin fitur)
  const { nama, email, phone, password, service_ids = [] } = req.body || {};
  if (!nama || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }
  if (!Array.isArray(service_ids) || service_ids.length < 1) {
    return res.status(400).json({ error: 'Minimal pilih 1 layanan' });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: 'Format nomor telepon tidak valid (gunakan 08xx atau 62xx)' });
  }

  // aturan domain → kuota
  const domain = getEmailDomain(email);
  const isUmi = domain === 'umi.com';
  const maxAllowed = isUmi ? 4 : 2;

  const uniqueServiceIds = [...new Set(service_ids.map(Number))];
  if (uniqueServiceIds.length > maxAllowed) {
    return res.status(400).json({
      error: `Maksimal ${maxAllowed} layanan untuk domain ${isUmi ? '@umi.com' : 'non-@umi.com'}.`,
      maxAllowed,
    });
  }

  const ROLE_ADMIN_FITUR = 2;
  const conn = (await db.getConnection?.()) || db;

  try {
    if (conn.beginTransaction) await conn.beginTransaction();

    // Email unik (tanpa ns filter)
    const [existing] = await conn.query(
      'SELECT id FROM admins WHERE email = ? LIMIT 1',
      [email]
    );
    if (existing.length > 0) {
      if (conn.rollback) await conn.rollback();
      return res.status(409).json({ error: 'Email sudah digunakan' });
    }

    // Pastikan role admin fitur ada
    const [roles] = await conn.query(
      'SELECT id FROM admin_roles WHERE id = ? LIMIT 1',
      [ROLE_ADMIN_FITUR]
    );
    if (roles.length === 0) {
      if (conn.rollback) await conn.rollback();
      return res.status(500).json({ error: 'Role Admin Fitur belum tersedia di database' });
    }

    // Validasi service id terhadap tabel services
    const placeholders = uniqueServiceIds.map(() => '?').join(',');
    const [validSvcs] = await conn.query(
      `SELECT id FROM services WHERE id IN (${placeholders})`,
      uniqueServiceIds
    );
    if (validSvcs.length !== uniqueServiceIds.length) {
      if (conn.rollback) await conn.rollback();
      return res.status(400).json({ error: 'Terdapat service_id yang tidak valid' });
    }

    // Hash & insert admin
    const hashed = await bcrypt.hash(password, 10);
    const [ins] = await conn.query(
      `INSERT INTO admins (nama, email, phone, password, role_id, verification_id)
       VALUES (?, ?, ?, ?, ?, 1)`,
      [nama, email, phone || null, hashed, ROLE_ADMIN_FITUR]
    );
    const adminId = ins.insertId;

    // Mapping layanan
    if (uniqueServiceIds.length) {
      const values = uniqueServiceIds.map((sid) => [adminId, sid]);
      await conn.query(
        'INSERT INTO admin_services (admin_id, service_id) VALUES ?',
        [values]
      );
    }

    // Generate ns (3–32 alnum)
    const ns = crypto.randomBytes(8).toString('hex');

    if (conn.commit) await conn.commit();
    return res.status(201).json({
      ok: true,
      message: `Pendaftaran admin berhasil. Kuota domain: ${maxAllowed}.`,
      admin_id: adminId,
      service_ids: uniqueServiceIds,
      maxAllowed,
      ns,
    });
  } catch (err) {
    if (conn.rollback) await conn.rollback();
    if (err?.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Email/Telepon sudah digunakan' });
    }
    console.error('Error register admin:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  } finally {
    if (conn.release) conn.release();
  }
}
