// pages/api/services.js
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Metode tidak diizinkan' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, name, created_at, updated_at FROM services ORDER BY id ASC'
    );
    return res.status(200).json(rows);
  } catch (err) {
    console.error('Error fetching services:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' });
  }
}
