import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // bisa diakses user, admin_fitur, atau super_admin
  const auth = await verifyAuth(req, ['user', 'super_admin', 'admin_fitur']);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized' });

  let conn;
  try {
    conn = await db.getConnection();

    const [rows] = await conn.query(`
    SELECT m.id, m.menu, m.harga, r.resto
    FROM bimeal_menu m
    JOIN bimeal_resto r ON m.resto_id = r.id
    ORDER BY m.menu ASC
    `);


    conn?.release();
    return res.status(200).json(rows);
  } catch (e) {
    conn?.release();
    console.error('GET /api/bimeal/menu error:', e.message, e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: e.message });
  }
}
