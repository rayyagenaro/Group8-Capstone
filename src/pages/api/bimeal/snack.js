import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyAuth(req, ['user','super_admin','admin_fitur']);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();
    const [rows] = await conn.query(
      `SELECT id, paket, harga FROM bimeal_snack ORDER BY paket`
    );
    conn?.release();
    return res.status(200).json(rows);
  } catch (e) {
    conn?.release();
    console.error('GET /api/bimeal/snack error:', e.message);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: e.message });
  }
}
