// /pages/api/updateDriversStatus.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "PUT") {
    const { driverId, newStatusId } = req.body;

    if (!driverId || !newStatusId) {
      return res.status(400).json({ error: "driverId dan newStatusId wajib diisi" });
    }

    try {
      const query = `UPDATE bidrive_drivers SET driver_status_id = ? WHERE id = ?`;
      const [result] = await db.query(query, [newStatusId, driverId]);

      return res.status(200).json({ message: "Status driver berhasil diperbarui" });
    } catch (error) {
      return res.status(500).json({ error: "Gagal update status driver", details: error.message });
    }
  } else {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
