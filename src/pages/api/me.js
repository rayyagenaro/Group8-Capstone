// pages/api/me.js
import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader } from '@/lib/resolve';
import { resolveUser } from '@/lib/resolve';
import { resolveAdmin } from '@/lib/resolve-server';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  const cookies = parseCookieHeader(req.headers.cookie);
  const ns = getNsFromReq(req);
  const scope = String(req.query.scope || '').toLowerCase();

  try {
    if (scope === 'user') {
      const u = await resolveUser(ns, cookies);
      return res.status(200).json(u);
    }

    if (scope === 'admin') {
      const a = await resolveAdmin(ns, cookies);
      return res.status(200).json(a);
    }

    // default: check both
    const [u, a] = await Promise.all([resolveUser(ns, cookies), resolveAdmin(ns, cookies)]);
    return res.status(200).json({ scope: 'both', user: u, admin: a });
  } catch (e) {
    console.error('me API error:', e);
    return res.status(500).json({
      scope: scope || 'both',
      error: 'parse_or_verify_failed',
      user: { hasToken: false, scope: null, payload: null, ns: null, cookieName: null },
      admin: { hasToken: false, scope: null, payload: null, ns: null, cookieName: null },
    });
  }
}
