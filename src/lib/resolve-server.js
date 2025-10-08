// lib/resolve-server.js
import db from '@/lib/db';
import { normalizeRole } from './role';
import { getCookie, getCookiesByPrefix, verifyOrNull, chooseLatestValidTokenPayload } from './resolve';

// ========== Admin Resolver ==========
async function getAdminServiceIds(adminId) {
  if (!adminId) return [];
  const [rows] = await db.query('SELECT service_id FROM admin_services WHERE admin_id = ?', [
    Number(adminId),
  ]);
  return rows.map((r) => Number(r.service_id));
}

async function enrichAdminPayload(payload, ns, cookieName) {
  const roleNormalized = normalizeRole(payload?.role);
  const adminId = payload.id ?? payload.admin_id ?? (payload.sub ? Number(payload.sub) : null);
  const service_ids = roleNormalized === 'super_admin' ? null : await getAdminServiceIds(adminId);

  return {
    hasToken: true,
    scope: roleNormalized, // "super_admin" | "admin_fitur"
    payload: { ...payload, roleNormalized, admin_id: adminId, service_ids },
    cookieName,
    ns,
  };
}

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

    return enrichAdminPayload(
      chosen.payload,
      chosen.cookieName?.replace(/^admin_session__/, '') || null,
      chosen.cookieName
    );
  }

  const token =
    getCookie(cookies, `admin_session_${ns}`) ||
    getCookie(cookies, 'admin_session');

  const payload = await verifyOrNull(token);
  if (!payload || (payload.ns && payload.ns !== ns)) {
    return { hasToken: false, scope: null, payload: null, ns, cookieName: null };
  }

  return enrichAdminPayload(
    payload,
    ns,
    token
      ? (getCookie(cookies, `admin_session_${ns}`) ? `admin_session_${ns}` : 'admin_session')
      : null
  );
}
