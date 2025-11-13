// /pages/api/getDrivers.js
import db from "@/lib/db";

export default async function handler(req, res) {
  if (req.method === "GET") {
    try {
      const [drivers] = await db.query("SELECT id, name, phone FROM bidrive_drivers");
      res.status(200).json(drivers);
    } catch (error) {
      res.status(500).json({ error: "Gagal mengambil data driver", details: error.message });
    }
  } else {
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
