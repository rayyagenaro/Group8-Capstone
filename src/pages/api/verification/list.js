import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.phone, u.nip, u.created_at
         FROM users u
        WHERE u.verification_status_id = 1
        ORDER BY u.created_at ASC`
    );
    return res.status(200).json({ data: rows });
  } catch (e) {
    console.error('verification/list error:', e);
    return res.status(500).json({ error: 'Gagal mengambil antrian verifikasi' });
  }
}
