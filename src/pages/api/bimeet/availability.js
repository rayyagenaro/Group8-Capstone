// /pages/api/bimeet/availability.js
import db from "@/lib/db";

// sama dengan di createbooking.js: "YYYY-MM-DD HH:mm:ss"
function toSqlDateTime(isoOrDate) {
  const d = new Date(isoOrDate);
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const h = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const s = pad(d.getSeconds());
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}

const FALLBACK_ROOMS = [
  { id: 1, name: "SP", floor: 2, capacity: 15 },
  { id: 2, name: "MI", floor: 3, capacity: 15 },
  { id: 3, name: "Blambangan", floor: 4, capacity: 50 },
  { id: 4, name: "Jenggolo", floor: 4, capacity: 15 },
  { id: 5, name: "Integritas", floor: 4, capacity: 15 },
  { id: 6, name: "Profesionalisme", floor: 4, capacity: 15 },
  { id: 7, name: "Kahuripan", floor: 5, capacity: 70 },
  { id: 8, name: "Singosari", floor: 5, capacity: 300 },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { start, end } = req.query;
    if (!start || !end) return res.status(400).json({ error: "start & end are required (ISO string)" });

    const startDt = new Date(start);
    const endDt = new Date(end);
    if (isNaN(startDt) || isNaN(endDt) || endDt <= startDt) {
      return res.status(400).json({ error: "Invalid datetime range" });
    }

    const startSQL = toSqlDateTime(startDt);
    const endSQL   = toSqlDateTime(endDt);

    try {
      // Pakai EXISTS (aman untuk ONLY_FULL_GROUP_BY).
      // Perbaikan utama: cek kolom STATUS_ID (Approved = 2), bukan b.status.
      const [rows] = await db.query(
        `
        SELECT
          r.id, r.name, r.floor, r.capacity,
          rs.id AS status_id, rs.name AS status_name,
          EXISTS(
            SELECT 1
            FROM bimeet_bookings b
            WHERE b.room_id = r.id
              AND b.status_id = 2
              AND NOT (b.end_datetime <= ? OR b.start_datetime >= ?)
            LIMIT 1
          ) AS has_conflict
        FROM bimeet_rooms r
        JOIN bimeet_room_status rs ON rs.id = r.status_id
        ORDER BY r.floor, r.name
        `,
        [startSQL, endSQL]
      );

      const data = rows.map((r) => ({
        id: r.id,
        name: r.name,
        floor: r.floor,
        capacity: r.capacity,
        status_id: r.status_id,
        status_name: r.status_name,
        // available = status master AVAILABLE (1) dan tidak ada booking Approved yang overlap
        available: Number(r.status_id) === 1 && Number(r.has_conflict) === 0,
      }));

      return res.status(200).json({ rooms: data });
    } catch (e) {
      // Fallback: tetap coba cek konflik pakai status_id Approved (2).
      let conflictMap = {};
      try {
        const [crows] = await db.query(
          `
          SELECT room_id, COUNT(*) AS conflicts
          FROM bimeet_bookings
          WHERE NOT (end_datetime <= ? OR start_datetime >= ?)
            AND status_id = 2
          GROUP BY room_id
          `,
          [startSQL, endSQL]
        );
        conflictMap = Object.fromEntries(crows.map((r) => [r.room_id, Number(r.conflicts) > 0]));
      } catch {}

      const data = FALLBACK_ROOMS.map((r) => ({
        ...r,
        status_id: 1,
        status_name: "Available",
        available: !conflictMap[r.id],
      }));

      return res.status(200).json({ rooms: data });
    }
  } catch (err) {
    console.error("bimeet availability error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
