// /pages/api/booking-assigned.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const bookingId = Number(req.query.bookingId || 0);
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "bookingId tidak valid" });
  }

  try {
    // Drivers yang ditugaskan
    let drivers = [];
    try {
      const [rows] = await db.query(
        `SELECT DISTINCT d.id, d.name, d.phone
         FROM bidrive_booking_assignments ba
         JOIN bidrive_drivers d ON d.id = ba.driver_id
         WHERE ba.booking_id = ? AND ba.driver_id IS NOT NULL
         ORDER BY d.name ASC`,
        [bookingId]
      );
      drivers = rows || [];
    } catch (e) {
      if (e?.code === "ER_NO_SUCH_TABLE") {
        drivers = [];
      } else {
        console.error("booking-assigned (drivers) error:", e);
        throw e;
      }
    }

    // Vehicles yang ditugaskan
    let vehicles = [];
    try {
      const [rows] = await db.query(
        `SELECT DISTINCT
            v.id,
            v.plat_nomor,
            v.vehicle_type_id,
            vt.name AS type_name
        FROM bidrive_booking_assignments ba
        JOIN bidrive_vehicles v ON v.id = ba.vehicle_id
        LEFT JOIN bidrive_vehicle_types vt ON vt.id = v.vehicle_type_id
        WHERE ba.booking_id = ? AND ba.vehicle_id IS NOT NULL
        ORDER BY v.id ASC`,
        [bookingId]
      );
      vehicles = rows || [];
    } catch (e) {
      if (e?.code === "ER_NO_SUCH_TABLE") {
        vehicles = [];
      } else {
        console.error("booking-assigned (vehicles) error:", e);
        throw e;
      }
    }


    return res.status(200).json({ bookingId, drivers, vehicles });
  } catch (error) {
    console.error("GET /api/booking-assigned error:", error);
    return res.status(500).json({ error: "Gagal mengambil data penugasan" });
  }
}
