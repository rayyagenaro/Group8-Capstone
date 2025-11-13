// /pages/api/jenis-kelamin.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // Bisa diakses oleh user maupun admin
  const auth = await verifyAuth(req, ['user', 'admin']);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, jenis_kelamin FROM jenis_kelamin ORDER BY id ASC`
    );

    return res.status(200).json({
      ok: true,
      data: rows || []
    });
  } catch (e) {
    console.error('[API jenis-kelamin] error:', e);
    return res.status(500).json({
      ok: false,
      error: 'Internal server error',
      details: e.message
    });
  }
}
