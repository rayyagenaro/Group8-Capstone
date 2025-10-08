// lib/auth.js
import { jwtVerify } from 'jose';
import { getNsFromReq } from '@/lib/ns-server';
import { normalizeRole } from './role';

/* 🔹 Mapping role → scope */
const ROLE_TO_SCOPE = {
  super_admin: ['admin'], // bisa semua
  admin_fitur: ['admin'],
  user: ['user'],
};

/* 🔹 Parser cookies untuk API Next.js */
export function parseCookies(req) {
  const list = {};
  const rc = req.headers?.cookie;
  if (!rc) return list;
  rc.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift().trim();
    const val = decodeURIComponent(parts.join('='));
    list[key] = val;
  });
  return list;
}

/**
 * Universal auth verifier (untuk User maupun Admin).
 *
 * @param {NextApiRequest} req - Request dari API Next.js
 * @param {string[]} roles - Role yang diizinkan (default: ['user'])
 * @param {string} scope - Scope target ('user' atau 'admin')
 */
export async function verifyAuth(req, roles = ['user'], scope = 'user') {
  try {
    const ns = getNsFromReq(req);
    if (!ns) return { ok: false, reason: 'NO_NS' };

    // Tentukan cookie sesuai area
    const cookieNameUser = `user_session_${ns}`;
    const cookieNameAdmin = `admin_session_${ns}`;

    // 🔹 Gunakan parser kalau req.cookies undefined
    const cookies = req.cookies || parseCookies(req);

    const token =
      cookies[cookieNameUser] ||
      cookies[cookieNameAdmin] ||
      null;

    if (!token) return { ok: false, reason: 'NO_TOKEN' };

    const secret = process.env.JWT_SECRET;
    if (!secret) return { ok: false, reason: 'NO_SECRET' };

    let payload;
    try {
      const res = await jwtVerify(token, new TextEncoder().encode(secret), {
        algorithms: ['HS256'],
        clockTolerance: 10,
      });
      payload = res.payload;
    } catch (err) {
      return { ok: false, reason: 'JWT_INVALID', error: err.message };
    }

    // Cross-check ns dalam payload (kalau ada)
    if (payload?.ns && payload.ns !== ns) {
      return { ok: false, reason: 'NS_MISMATCH' };
    }

    const roleNorm = normalizeRole(payload?.role || payload?.role_name);
    const roleIdNum = Number(payload?.role_id ?? 0);

    // Super admin bypass semua scope
    if (roleIdNum === 1 || roleNorm === 'super_admin') {
      return {
        ok: true,
        payload,
        userId: Number(payload?.sub ?? payload?.user_id ?? payload?.id),
        role: 'super_admin',
        roleId: 1,
        ns,
        scope,
      };
    }

    // Cek apakah role ada di daftar yang diizinkan
    if (!roles.includes(roleNorm)) {
      return { ok: false, reason: 'ROLE' };
    }

    // Cek apakah role diizinkan di scope ini
    const allowedScopes = ROLE_TO_SCOPE[roleNorm] || [];
    if (!allowedScopes.includes(scope)) {
      return { ok: false, reason: 'SCOPE_MISMATCH', role: roleNorm, ns };
    }

    const userId = Number(payload?.sub ?? payload?.user_id ?? payload?.id);

    return { ok: true, payload, userId, role: roleNorm, roleId: roleIdNum, ns, scope };
  } catch (e) {
    return { ok: false, reason: 'VERIFY_FAIL', error: e.message };
  }
}
