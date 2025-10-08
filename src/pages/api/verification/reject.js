import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
  const { userId, reason } = req.body || {};
  if (!userId || !reason?.trim()) {
    return res.status(400).json({ error: 'userId dan reason wajib diisi' });
  }

  try {
    const [result] = await db.query(
      `UPDATE users
          SET verification_status_id = 3, rejection_reason = ?
        WHERE id = ?`,
      [reason.trim(), userId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }
    return res.status(200).json({ message: 'User berhasil ditolak.' });
  } catch (e) {
    console.error('verification/reject error:', e);
    return res.status(500).json({ error: 'Gagal menolak user.' });
  }
}
