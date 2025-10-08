import { jwtVerify } from 'jose';
import { normalizeRole } from './role';

const SECRET_STR = process.env.JWT_SECRET || '';
const SECRET = new TextEncoder().encode(SECRET_STR);

// ===== Helpers umum =====
export function getCookie(cookies, name) {
  const hit = cookies.find(([n]) => n === name);
  return hit ? hit[1] : undefined;
}

export function getCookiesByPrefix(cookies, prefix) {
  return cookies.filter(([n]) => n.startsWith(prefix));
}

export function parseCookieHeader(header) {
  return String(header || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf('=');
      if (i === -1) return [s, ''];
      const name = s.slice(0, i);
      const v = s.slice(i + 1);
      try {
        return [name, decodeURIComponent(v)];
      } catch {
        return [name, v];
      }
    });
}

export async function verifyOrNull(token) {
  if (!token || !SECRET_STR) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      algorithms: ['HS256'],
      clockTolerance: 10,
    });
    return payload;
  } catch {
    return null;
  }
}

export async function chooseLatestValidTokenPayload(pairs) {
  const verified = await Promise.all(
    pairs.map(async ([name, token]) => {
      const payload = await verifyOrNull(token);
      return payload ? { name, payload } : null;
    })
  );
  const valid = verified.filter(Boolean);
  if (!valid.length) return null;

  valid.sort(
    (a, b) =>
      Number(b.payload?.exp || 0) - Number(a.payload?.exp || 0) ||
      Number(b.payload?.iat || 0) - Number(a.payload?.iat || 0)
  );
  return { cookieName: valid[0].name, payload: valid[0].payload };
}

// ===== User Resolver (client-safe) =====
export async function resolveUser(ns, cookies) {
  if (!ns) {
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'user_session__'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'user_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'user_session', payload } : null;
      })());

    if (!chosen) {
      return { hasToken: false, scope: null, payload: null, ns: null, cookieName: null };
    }

    return {
      hasToken: true,
      scope: 'user',
      payload: { ...chosen.payload, roleNormalized: normalizeRole(chosen.payload?.role) },
      cookieName: chosen.cookieName,
      ns: chosen.cookieName?.replace(/^user_session_/, '') || null,
    };
  }

  const token =
    getCookie(cookies, `user_session_${ns}`) ||
    getCookie(cookies, 'user_session');

  const payload = await verifyOrNull(token);
  if (!payload || (payload.ns && payload.ns !== ns)) {
    return { hasToken: false, scope: null, payload: null, ns, cookieName: null };
  }

  return {
    hasToken: true,
    scope: 'user',
    payload: { ...payload, roleNormalized: normalizeRole(payload.role) },
    cookieName: token
      ? (getCookie(cookies, `user_session_${ns}`) ? `user_session_${ns}` : 'user_session')
      : null,
    ns,
  };
}

// ===== Admin Resolver (client-safe, tanpa DB) =====
export async function resolveAdmin(ns, cookies) {
  if (!ns) {
    const chosen =
      (await chooseLatestValidTokenPayload(getCookiesByPrefix(cookies, 'admin_session_'))) ||
      (await (async () => {
        const legacy = getCookie(cookies, 'admin_session');
        const payload = await verifyOrNull(legacy);
        return payload ? { cookieName: 'admin_session', payload } : null;
      })());

    if (!chosen) {
      return { hasToken: false, scope: null, payload: null, ns: null, cookieName: null };
    }

    return {
      hasToken: true,
      scope: normalizeRole(chosen.payload?.role),
      payload: { ...chosen.payload, roleNormalized: normalizeRole(chosen.payload?.role) },
      cookieName: chosen.cookieName,
      ns: chosen.cookieName?.replace(/^admin_session_/, '') || null,
    };
  }

  const token =
    getCookie(cookies, `admin_session_${ns}`) ||
    getCookie(cookies, 'admin_session');

  const payload = await verifyOrNull(token);
  if (!payload || (payload.ns && payload.ns !== ns)) {
    return { hasToken: false, scope: null, payload: null, ns, cookieName: null };
  }

  return {
    hasToken: true,
    scope: normalizeRole(payload.role),
    payload: { ...payload, roleNormalized: normalizeRole(payload.role) },
    cookieName: token
      ? (getCookie(cookies, `admin_session_${ns}`) ? `admin_session_${ns}` : 'admin_session')
      : null,
    ns,
  };
}
