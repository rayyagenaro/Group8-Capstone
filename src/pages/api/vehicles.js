// src/pages/api/vehicles.js  (atau pages/api/vehicles.js)
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  try {
    const { status = "available", type_id } = req.query;

    // Sesuaikan dengan skema kamu: 1 = Available, 2 = Unavailable
    const AVAILABLE_STATUS = 1;

    const where = [];
    const params = [];

    if (status === "available") {
      where.push("v.vehicle_status_id = ?");
      params.push(AVAILABLE_STATUS);
    }

    if (type_id) {
      const typeIds = String(type_id)
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);

      if (typeIds.length > 0) {
        where.push(`v.vehicle_type_id IN (${typeIds.map(() => "?").join(",")})`);
        params.push(...typeIds);
      }
    }

    const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const sql = `
      SELECT
        v.id,
        v.plat_nomor,
        v.tahun,
        v.vehicle_type_id,
        v.vehicle_status_id
      FROM bidrive_vehicles v
      ${whereClause}
      ORDER BY v.id ASC
    `;

    const [rows] = await db.query(sql, params);
    return res.status(200).json(rows);
  } catch (e) {
    console.error("GET /api/vehicles error:", e);
    return res.status(500).json({ error: "Gagal mengambil data vehicles", details: e.message });
  }
}
