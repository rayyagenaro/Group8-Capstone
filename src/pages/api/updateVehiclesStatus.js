// /pages/api/updateVehiclesStatus.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    res.setHeader("Allow", ["PUT"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { vehicleId, vehicleTypeId, newStatusId } = req.body || {};

    if (!newStatusId || (!vehicleId && !vehicleTypeId)) {
      return res.status(400).json({
        error: "newStatusId wajib. Sertakan salah satu: vehicleId ATAU vehicleTypeId.",
      });
    }

    let sql, params;

    if (vehicleId) {
      // MODE: update per UNIT
      sql = "UPDATE bidrive_vehicles SET vehicle_status_id = ? WHERE id = ?";
      params = [Number(newStatusId), Number(vehicleId)];
    } else {
      // MODE: update per TIPE (legacy, tetap didukung)
      sql = "UPDATE bidrive_vehicles SET vehicle_status_id = ? WHERE vehicle_type_id = ?";
      params = [Number(newStatusId), Number(vehicleTypeId)];
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tidak ada baris yang terupdate." });
    }

    return res.status(200).json({ ok: true, affected: result.affectedRows });
  } catch (error) {
    console.error("updateVehiclesStatus PUT error:", error);
    return res.status(500).json({ error: "Gagal update status kendaraan", details: error.message });
  }
}
