import db from "@/lib/db";

/**
 * GET /api/drivers
 *  - ?status=available|all (default: available)
 * Return:
 *   { id, name, phone, driver_status_id }
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { status = "available" } = req.query;

    // Dari datamu: 1 = available, 2 = tidak available
    const AVAILABLE_STATUS = 1;

    const where = status === "available" ? "WHERE d.driver_status_id = ?" : "";
    const params = status === "available" ? [AVAILABLE_STATUS] : [];

    const sql = `
      SELECT
        d.id,
        d.name,
        d.phone,              
        d.driver_status_id
      FROM bidrive_drivers d
      ${where}
      ORDER BY d.name ASC
    `;

    const [rows] = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (e) {
    console.error("GET /api/drivers error:", e);
    return res.status(500).json({ error: "Gagal mengambil data drivers", details: e.message });
  }
}
