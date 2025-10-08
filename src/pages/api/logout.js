// /pages/api/logout.js
export default async function handler(req, res) {
  if (!['GET', 'POST', 'DELETE'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST, DELETE');
    return res.status(405).end('Method Not Allowed');
  }

  const isProd = process.env.NODE_ENV === 'production';
  const cookieAttrs = (httpOnly = false) => [
    'Path=/',
    'SameSite=Lax',
    isProd ? 'Secure' : '',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
    httpOnly ? 'HttpOnly' : '',
  ].filter(Boolean).join('; ');

  const kill = (name, httpOnly = true) => `${name}=; ${cookieAttrs(httpOnly)}`;

  const nsFromReferer = () => {
    try {
      const u = new URL(String(req.headers.referer || ''));
      const ns = u.searchParams.get('ns');
      return ns && /^[A-Za-z0-9_-]{3,32}$/.test(ns) ? ns : undefined;
    } catch {
      return undefined;
    }
  };

  // --- Ambil param dari body/query/header ---
  const src = req.method === 'POST' ? (req.body || {}) : (req.query || {});
  const areaRaw = (src.area ?? req.headers['x-session-area'] ?? '').toString().toLowerCase();
  const nsRaw   = (src.ns   ?? req.headers['x-session-ns']   ?? '').toString();
  const allRaw  = (src.all  ?? req.headers['x-logout-all']   ?? '').toString().toLowerCase();

  const normArea = areaRaw === 'admin' || areaRaw === 'a' ? 'admin'
                   : areaRaw === 'user' || areaRaw === 'u' ? 'user'
                   : undefined;

  const ns = /^[A-Za-z0-9_-]{3,32}$/.test(nsRaw) ? nsRaw : (nsFromReferer() || undefined);
  const wantGlobal = allRaw === '1' || allRaw === 'true';

  // --- Parse semua cookies dari request header (untuk infer dan global logout) ---
  const headerCookies = String(req.headers.cookie || '');
  const cookiePairs = headerCookies
    .split(';').map(s => s.trim()).filter(Boolean)
    .map(s => {
      const i = s.indexOf('=');
      return i === -1 ? [s, ''] : [s.slice(0, i), s.slice(i + 1)];
    });

  const listByPrefix = (prefix) => cookiePairs
    .map(([name]) => name)
    .filter((n) => n.startsWith(prefix));

  // --- Daftar legacy + sticky ---
  const legacyHttpOnly = [
    'user_session', 'admin_session',
    'token', 'user_token', 'admin_token',
  ];
  const legacyClient   = []

  // ==== MODE 1: GLOBAL LOGOUT ====
  if (wantGlobal) {
    let setCookies = [];
    setCookies = setCookies.concat(legacyHttpOnly.map(n => kill(n, true)));
    setCookies = setCookies.concat(legacyClient.map(n => kill(n, false)));
    setCookies = setCookies.concat(listByPrefix('user_session__').map(n => kill(n, true)));
    setCookies = setCookies.concat(listByPrefix('admin_session__').map(n => kill(n, true)));
    setCookies = Array.from(new Set(setCookies));
    res.setHeader('Set-Cookie', setCookies);
    return res.status(200).json({ ok: true, scope: 'global', cleared: setCookies.length });
  }

  // ==== MODE 2: PER-NAMESPACE ====
  if (!normArea) {
    return res.status(400).json({
      ok: false,
      error: 'area_required',
      hint: 'Kirim { area: "user"|"admin", ns } atau set all=true untuk global logout.'
    });
  }

  let finalNs = ns;
  if (!finalNs) {
    const prefix = normArea === 'admin' ? 'admin_session__' : 'user_session__';
    const candidates = listByPrefix(prefix);
    if (candidates.length === 1) {
      finalNs = candidates[0].slice(prefix.length);
    } else {
      return res.status(400).json({
        ok: false,
        error: 'ns_required_or_ambiguous',
        hint: candidates.length
          ? 'Banyak sesi ditemukan. Kirim ns eksplisit agar logout tidak menendang sesi lain.'
          : 'Tidak ada sesi aktif untuk area ini. Kirim ns eksplisit atau gunakan all=true untuk global.'
      });
    }
  }

  const cookieName = `${normArea === 'admin' ? 'admin' : 'user'}_session_${finalNs}`;
  const setCookies = Array.from(new Set([
    kill(cookieName, true),
  ]));

  res.setHeader('Set-Cookie', setCookies);
  return res.status(200).json({ ok: true, scope: 'namespace', area: normArea, ns: finalNs, cleared: setCookies });
}
