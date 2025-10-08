import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId wajib diisi' });

  try {
    const [result] = await db.query(
      `UPDATE users
          SET verification_status_id = 2, rejection_reason = NULL
        WHERE id = ? AND verification_status_id <> 2`,
      [userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan atau sudah verified.' });
    }
    return res.status(200).json({ message: 'User berhasil diverifikasi.' });
  } catch (e) {
    console.error('verification/approve error:', e);
    return res.status(500).json({ error: 'Gagal memverifikasi user.' });
  }
}
