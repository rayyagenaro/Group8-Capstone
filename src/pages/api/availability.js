// pages/api/availability.js
import db from "@/lib/db";

export default async function handler(req, res) {
  try {
    // Hitung jumlah driver
    const [driversRows] = await db.query("SELECT COUNT(*) as total FROM bidrive_drivers");
    const totalDrivers = driversRows[0].total;

    // Hitung jumlah kendaraan per tipe
    const [vehicleTypes] = await db.query(`
      SELECT vt.name as jenis, COUNT(v.id) as jumlah
      FROM vehicle_types vt
      LEFT JOIN vehicles v ON v.vehicle_type_id = vt.id
      GROUP BY vt.id
    `);

    res.status(200).json({
      drivers: totalDrivers,
      vehicles: vehicleTypes, 
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
