// Handler bersama untuk preview (dipakai banyak route bila perlu)
import db from '@/lib/db';
import { getAdapter } from './index';

const toYMD = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export async function handlePreview({ req, res, moduleKey }) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const adapter = getAdapter(moduleKey);
    if (!adapter) return res.status(400).json({ error: 'module tidak dikenali' });

    const fromYMD = toYMD(req.query.from);
    const toY     = toYMD(req.query.to);

    const { columns, rows } = await adapter.preview({ db, fromYMD, toYMD: toY });
    return res.status(200).json({ columns, rows });
  } catch (e) {
    console.error('preview error:', e);
    return res.status(500).json({ error: 'internal error' });
  }
}
