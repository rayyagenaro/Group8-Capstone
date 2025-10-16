import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const query = "SELECT id, name FROM bidrive_vehicle_types ORDER BY name ASC";
      const [vehicleTypes] = await db.query(query);
      return res.status(200).json(vehicleTypes);
    } catch (error) {
      console.error("Get Vehicle Types API Error:", error);
      return res.status(500).json({ error: "Gagal mengambil data tipe kendaraan." });
    }
  }

  res.setHeader("Allow", ["GET"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}