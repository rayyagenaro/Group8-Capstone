import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import { SignJWT } from 'jose';
import { getNsFromReq, NS_RE } from '@/lib/ns-server';   // ✅ pakai NS_RE juga

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ns = (getNsFromReq(req) || '').trim();
  const email = (req.body?.email || '').trim().toLowerCase();
  const password = req.body?.password || '';

  if (!email || !password || !NS_RE.test(ns)) {
    return res.status(400).json({
      error: 'Email, password, dan ns wajib diisi (ns 3-32 alnum_-).'
    });
  }

  try {
    // 🔹 Cari user di DB
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.password, u.verification_status_id, u.rejection_reason,
              vs.name AS verification_status_name
       FROM users u
       JOIN verification_status vs ON vs.id = u.verification_status_id
       WHERE u.email = ? LIMIT 1`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Email atau password salah' });
    }

    const user = rows[0];

    // 🔹 Status verifikasi
    if (user.verification_status_id === 1) {
      return res.status(403).json({ error: 'Akun Anda masih menunggu verifikasi admin (Pending).' });
    }
    if (user.verification_status_id === 3) {
      return res.status(403).json({
        error: `Akun Anda ditolak.${user.rejection_reason ? ' Alasan: ' + user.rejection_reason : ''}`
      });
    }

    // 🔹 Cek password
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' });

    // 🔹 JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'JWT_SECRET belum diset.' });

    const maxAge = 60 * 60; // 1 jam
    const token = await new SignJWT({
      sub: String(user.id),
      email: user.email,
      name: user.name,
      role: 'user',
      phone: user.phone ?? null,
      ns,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(`${maxAge}s`)
      .sign(new TextEncoder().encode(secret));

    const isProd = process.env.NODE_ENV === 'production';
        // 🔹 Cari semua cookie admin_session__* dan kill
    // const killOldUser = allCookies
    //   .map(c => {
    //     const name = c.split('=')[0];
    //     return name.startsWith('user_session_')
    //       ? `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${isProd ? '; Secure' : ''}`
    //       : null;
    //   })
    //   .filter(Boolean);

    // 🔹 Session cookie per namespace (HttpOnly)
    const cookieName = `user_session_${ns}`;
    const sessionAttrs = [
      'Path=/',
      'HttpOnly',
      'SameSite=Lax',
      isProd ? 'Secure' : '',
      `Max-Age=${maxAge}`,
    ].filter(Boolean).join('; ');

    // 🔹 Set cookies (tanpa sticky)
    res.setHeader('Set-Cookie', [
      // ...killOldUser, // hapus semua session user lama
      `${cookieName}=${token}; ${sessionAttrs}`,
      `user_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `user_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
      `token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0;${isProd ? ' Secure;' : ''}`,
    ]);

    // 🔹 Balikan JSON
    return res.status(200).json({
      ok: true,
      ns,
      redirect: `/User/HalamanUtama/hal-utamauser?ns=${encodeURIComponent(ns)}`,
      whoami: { id: user.id, email: user.email, name: user.name, ns },
    });
  } catch (e) {
    console.error('Login User Error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
