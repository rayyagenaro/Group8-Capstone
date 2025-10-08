// lib/ns-server.js

export const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export function getNsFromReq(req) {
  if (!req) return null;

  // 🔹 1. Sticky cookies (kalau masih ada legacy)
  const stickyAdmin = req.cookies?.current_admin_ns;
  if (typeof stickyAdmin === 'string' && NS_RE.test(stickyAdmin)) return stickyAdmin;

  const stickyUser = req.cookies?.current_user_ns;
  if (typeof stickyUser === 'string' && NS_RE.test(stickyUser)) return stickyUser;

  // 🔹 2. Session cookies dengan prefix
  const cookieKeys = Object.keys(req.cookies || {});
  const adminPrefix = 'admin_session_';
  const userPrefix  = 'user_session_';

  const foundAdmin = cookieKeys.find((k) => k.startsWith(adminPrefix));
  if (foundAdmin) {
    const ns = foundAdmin.slice(adminPrefix.length);
    if (NS_RE.test(ns)) return ns;
  }

  const foundUser = cookieKeys.find((k) => k.startsWith(userPrefix));
  if (foundUser) {
    const ns = foundUser.slice(userPrefix.length);
    if (NS_RE.test(ns)) return ns;
  }

  // 🔹 3. Query param
  let qns = req.query?.ns;
  if (!qns && typeof req.url === 'string' && req.url.includes('?')) {
    try {
      const u = new URL(req.url, 'http://x'); // base dummy biar URL bisa di-parse
      qns = u.searchParams.get('ns');
    } catch {}
  }
  if (typeof qns === 'string' && NS_RE.test(qns)) return qns;

  // 🔹 4. Body
  const bns = req.body?.ns;
  if (typeof bns === 'string' && NS_RE.test(bns)) return bns;

  return null;
}
