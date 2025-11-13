// src/pages/api/reject-booking.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ ok: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    const { bookingId, reason } = req.body || {};
    if (!bookingId || !reason?.trim()) {
      return res.status(400).json({ ok: false, message: "bookingId dan reason wajib diisi." });
    }

    // gunakan connection agar aman untuk dikembangkan (mis. tambah log/histori)
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 3 = Rejected
      const [result] = await connection.query(
        "UPDATE bidrive_bookings SET status_id = ?, rejection_reason = ? WHERE id = ?",
        [3, reason.trim(), bookingId]
      );

      if (result.affectedRows === 0) {
        await connection.rollback();
        return res.status(404).json({ ok: false, message: "Booking tidak ditemukan." });
        }

      await connection.commit();
      return res.status(200).json({ ok: true, message: "Booking berhasil ditolak." });
    } catch (err) {
      try { await connection.rollback(); } catch {}
      return res.status(500).json({ ok: false, message: err.message || "Gagal memproses penolakan." });
    } finally {
      connection.release();
    }
  } catch (outer) {
    // fallback jika db.getConnection gagal atau error lain
    return res.status(500).json({ ok: false, message: outer.message || "Terjadi kesalahan server." });
  }
}
