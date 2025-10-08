// /pages/api/loginAdmin.js
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getNsFromReq, NS_RE } from '@/lib/ns-server';   // ✅ ambil ns konsisten dari server-side

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 🔹 Ambil ns: body > query/cookie
  const ns = (req.body?.ns || getNsFromReq(req) || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password || !NS_RE.test(ns)) {
    return res.status(400).json({
      error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).',
    });
  }

  try {
    // 🔹 Cari admin di DB
    const [rows] = await db.query(
      `SELECT a.id, a.email, a.nama, a.password, a.role_id, a.verification_id,
              r.role AS role_name
       FROM admins a
       LEFT JOIN admin_roles r ON r.id = a.role_id
       WHERE a.email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const admin = rows[0];

    // 🔹 Cek password
    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    const isSuperAdmin = Number(admin.role_id) === 1;
    const isVerified   = Number(admin.verification_id) === 2;

    // Admin fitur harus diverifikasi
    if (!isSuperAdmin && !isVerified) {
      return res.status(403).json({
        error:
          Number(admin.verification_id) === 1
            ? 'Akun admin menunggu verifikasi Super Admin.'
            : 'Akun admin ditolak. Hubungi Super Admin.',
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    // 🔹 Role normalisasi
    const roleNormalized = isSuperAdmin ? 'super_admin' : 'admin_fitur';

    // 🔹 Buat JWT
    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(admin.id),
      email: admin.email,
      name: admin.nama,
      role: roleNormalized,
      role_id: Number(admin.role_id),
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';

    // 🔹 Ambil semua cookies lama dari header
    const rawCookies = String(req.headers.cookie || '');
    const allCookies = rawCookies.split(';').map(c => c.trim()).filter(Boolean);

    // 🔹 Cari semua cookie admin_session__* dan kill
    const killOldAdmin = allCookies
      .map(c => {
        const name = c.split('=')[0];
        return name.startsWith('admin_session_')
          ? `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`
          : null;
      })
      .filter(Boolean);

    // 🔹 Set cookie baru + bersihkan legacy
    res.setHeader('Set-Cookie', [
      ...killOldAdmin, // hapus semua session admin lama
      `admin_session_${ns}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${isProd ? '; Secure' : ''}`,
      `admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
      `admin_token=;  Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
      `token=;        Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`,
    ]);

    // 🔹 Tentukan redirect URL
    const redirectUrl = `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`;

    return res.status(200).json({
      ok: true,
      redirect: redirectUrl,
      whoami: {
        id: admin.id,
        email: admin.email,
        name: admin.nama,
        role: roleNormalized,
        role_id: admin.role_id,
        verification_id: admin.verification_id,
        ns,
      },
    });
  } catch (e) {
    console.error('Login Admin Error:', e);
    return res.status(500).json({
      error: 'Terjadi kesalahan server',
      detail: e.message,
    });
  }
}
