// /pages/api/vehicle-availability.js
import db from "@/lib/db";

// Asumsi: vehicle_status_id = 1 => Available
//         driver_status_id  = 1 => Available (kalau kamu punya tabel drivers)
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  try {
    // Ambil jumlah driver tersedia (opsional, kalau kamu tampilkan di UI)
    const [driverRows] = await db.query(
      `SELECT COUNT(*) AS available_drivers 
       FROM bidrive_drivers
       where driver_status_id = 1`
    );
    const drivers = driverRows?.[0]?.available_drivers ?? 0;

    // Ambil jumlah kendaraan tersedia per Tipe
    const [vehicleRows] = await db.query(
      `SELECT vt.id AS type_id, vt.name AS type_name, 
              COUNT(v.id) AS available_count
       FROM bidrive_vehicle_types vt
       LEFT JOIN bidrive_vehicles v 
         ON v.vehicle_type_id = vt.id 
        AND v.vehicle_status_id = 1   
       GROUP BY vt.id, vt.name
       ORDER BY vt.id`
    );

    // bentuk respons yang mudah dipakai front-end
    const vehicles = vehicleRows.map(r => ({
      type_id: r.type_id,
      type_name: r.type_name,
      available: Number(r.available_count) || 0,
    }));

    return res.status(200).json({ drivers, vehicles });
  } catch (e) {
    console.error("vehicle-availability error:", e);
    return res.status(500).json({ error: "Gagal mengambil ketersediaan", details: e.message });
  }
}
