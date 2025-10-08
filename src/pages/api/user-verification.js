    // pages/api/user-verification.js
import db from '@/lib/db';

/**
 * Endpoint untuk verifikasi / penolakan user oleh admin
 * POST body:
 *  { userId: number, action: "verify" | "reject", reason?: string }
 *
 * mapping status:
 *  1 = Pending, 2 = Verified, 3 = Rejected
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { userId, action, reason } = req.body || {};
    const uid = Number(userId);

    if (!uid || !action) {
      return res.status(400).json({ error: 'userId dan action wajib diisi.' });
    }

    if (!['verify', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action harus "verify" atau "reject".' });
    }

    if (action === 'reject' && !String(reason || '').trim()) {
      return res.status(400).json({ error: 'Alasan penolakan wajib diisi.' });
    }

    const newStatus = action === 'verify' ? 2 : 3;

    const [result] = await db.query(
      'UPDATE users SET verification_status_id = ?, rejection_reason = ? WHERE id = ?',
      [newStatus, action === 'reject' ? String(reason).trim() : null, uid]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User tidak ditemukan.' });
    }

    return res.status(200).json({
      ok: true,
      message: action === 'verify' ? 'User berhasil diverifikasi.' : 'User berhasil ditolak.',
      verification_status_id: newStatus,
    });
  } catch (err) {
    console.error('user-verification error:', err);
    return res.status(500).json({ error: 'Terjadi kesalahan server.' });
  }
}
