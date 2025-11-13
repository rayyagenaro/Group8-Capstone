// /pages/api/bookings-with-vehicle.js
import db from "@/lib/db";

export default async function handler(req, res) {
  const bookingId = Number(req.query.bookingId || 0);
  if (!Number.isFinite(bookingId) || bookingId <= 0) {
    return res.status(400).json({ error: "Booking ID tidak diberikan/invalid" });
  }

  try {
    // 1) data booking + user
    const [[bookingRow]] = await db.query(
      `SELECT b.*, u.name AS user_name
       FROM bidrive_bookings b
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.id = ?
       LIMIT 1`,
      [bookingId]
    );
    if (!bookingRow) {
      return res.status(404).json({ error: "Booking tidak ditemukan." });
    }

    // 2) tipe kendaraan yang DIMINTA (kuota)
    const [vehicleTypes] = await db.query(
      `SELECT vt.id, vt.name, bvt.quantity
       FROM bidrive_booking_vehicle_types bvt
       JOIN bidrive_vehicle_types vt ON vt.id = bvt.vehicle_type_id
       WHERE bvt.booking_id = ?
       ORDER BY vt.name ASC`,
      [bookingId]
    );

    // 3) drivers yang DITUGASKAN
    let assignedDrivers = [];
    try {
      const [rows] = await db.query(
        `SELECT DISTINCT d.id, d.name, d.phone
         FROM bidrive_booking_assignments ba
         JOIN bidrive_drivers d ON d.id = ba.driver_id
         WHERE ba.booking_id = ? AND ba.driver_id IS NOT NULL
         ORDER BY d.name ASC`,
        [bookingId]
      );
      assignedDrivers = rows || [];
    } catch (e) {
      if (e && e.code === "ER_NO_SUCH_TABLE") {
        assignedDrivers = [];
      } else {
        console.error("assignedDrivers query error:", e);
        throw e;
      }
    }

    // 4) vehicles yang DITUGASKAN
    let assignedVehicles = [];
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
      assignedVehicles = rows || [];
    } catch (e) {
      if (e && e.code === "ER_NO_SUCH_TABLE") {
        assignedVehicles = [];
      } else if (e && e.code === "ER_BAD_FIELD_ERROR") {
        console.error("Kolom vehicles tidak cocok (cek nama kolom plat):", e);
        throw e;
      } else {
        console.error("assignedVehicles query error:", e);
        throw e;
      }
    }

    return res.status(200).json({
      ...bookingRow,
      vehicle_types: vehicleTypes || [],
      assigned_drivers: assignedDrivers,
      assigned_vehicles: assignedVehicles,
    });
  } catch (error) {
    console.error("Error API bookings-with-vehicle:", error);
    return res.status(500).json({ error: "Gagal mengambil data booking." });
  }
}
