// /pages/api/register.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import crypto from 'crypto';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const nama = (req.body?.nama || '').trim();
  const nip = (req.body?.nip || '').trim();
  const hp = (req.body?.hp || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!nama || !nip || !hp || !email || !password) {
    return res.status(400).json({ error: 'Semua field wajib diisi' });
  }

  try {
    // 🔹 cek email unik
    const [existing] = await db.query(
      `SELECT id FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email sudah terdaftar' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 simpan user tanpa ns
    const [result] = await db.query(
      `INSERT INTO users
        (name, email, phone, nip, password, verification_status_id, rejection_reason)
       VALUES (?, ?, ?, ?, ?, 1, NULL)`,
      [nama, email, hp, nip, hashedPassword]
    );

    // 🔹 generate ns baru (3–32 alnum)
    const ns = crypto.randomBytes(8).toString('hex');

    // 🔹 generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(result.insertId),
      email,
      name: nama,
      role: 'user',
      phone: hp,
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // 🔹 cookie session
    const cookieName = `user_session__${ns}`;
    const sessionAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    // 🔹 sticky cookie (biar frontend tahu ns)
    const stickyMaxAge = 60 * 60 * 24 * 30; // 30 hari
    const sticky = [
      `current_user_ns=${encodeURIComponent(ns)}`,
      'Path=/User',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${stickyMaxAge}`,
      `Expires=${new Date(Date.now() + stickyMaxAge * 1000).toUTCString()}`,
    ].filter(Boolean).join('; ');

    res.setHeader('Set-Cookie', [
      `${cookieName}=${token}; ${sessionAttrs}`,
      sticky,
    ]);

    return res.status(201).json({
      ok: true,
      ns,
      message: 'Registrasi berhasil. Akun menunggu verifikasi admin.',
      redirect: `/Login/hal-login?ns=${encodeURIComponent(ns)}`
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan di server' });
  }
}
