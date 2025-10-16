import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Ambil semua unit kerja
    const [rows] = await db.query("SELECT id, unit_kerja FROM unit_kerja ORDER BY unit_kerja ASC");

    return res.status(200).json(rows);
  } catch (err) {
    console.error("Error fetch unit_kerja:", err);
    return res.status(500).json({ error: "Gagal mengambil unit kerja" });
  }
}
