import db from "@/lib/db";
import { verifyAuth } from "@/lib/auth";

/** helper untuk insert bvt saat create booking */
function formatInsertBookingVehicleTypes(bookingId, vehicleDetails) {
  if (!Array.isArray(vehicleDetails) || vehicleDetails.length === 0) {
    return { query: "", values: [] };
  }
  const placeholder = vehicleDetails.map(() => "(?, ?, ?)").join(", ");
  const query = `
    INSERT INTO bidrive_booking_vehicle_types (booking_id, vehicle_type_id, quantity)
    VALUES ${placeholder}
  `;
  const values = vehicleDetails.flatMap((detail) => [
    bookingId,
    Number(detail.id),
    Number(detail.quantity) || 0,
  ]);
  return { query, values };
}

export default async function handler(req, res) {
  const action = String(req.query.action || req.body?.action || "").toLowerCase();

  // ===================== ASSIGN =====================
  if (req.method === "POST" && action === "assign") {
    // 🔐 hanya admin boleh assign
    const auth = await verifyAuth(req, ["super_admin", "admin_fitur"], "admin");
    if (!auth.ok) return res.status(401).json({ error: "Unauthorized" });

    const {
      bookingId,
      driverIds = [],
      vehicleIds = [],
      keterangan,
      updateStatusTo,
    } = req.body || {};

    const bid = Number(bookingId);
    if (!Number.isFinite(bid) || bid <= 0) {
      return res.status(400).json({ error: "bookingId wajib diisi" });
    }

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();

      if (updateStatusTo) {
        await conn.query(
          "UPDATE bidrive_bookings SET status_id = ?, keterangan = COALESCE(?, keterangan) WHERE id = ?",
          [Number(updateStatusTo), keterangan ?? null, bid]
        );
      }

      if (Array.isArray(vehicleIds) && vehicleIds.length) {
        const vals = vehicleIds.map((vid) => [bid, Number(vid), null]);
        await conn.query(
          `INSERT IGNORE INTO bidrive_booking_assignments (booking_id, vehicle_id, driver_id)
           VALUES ${vals.map(() => "(?,?,?)").join(",")}`,
          vals.flat()
        );
      }

      if (Array.isArray(driverIds) && driverIds.length) {
        const vals = driverIds.map((did) => [bid, null, Number(did)]);
        await conn.query(
          `INSERT IGNORE INTO bidrive_booking_assignments (booking_id, vehicle_id, driver_id)
           VALUES ${vals.map(() => "(?,?,?)").join(",")}`,
          vals.flat()
        );
      }

      await conn.commit();
      return res.status(200).json({ ok: true });
    } catch (e) {
      await conn.rollback();
      console.error("Assign error:", e);
      return res.status(500).json({ error: "Gagal menyimpan penugasan." });
    } finally {
      conn.release();
    }
  }

  // ===================== GET =====================
  if (req.method === "GET") {
    const isAdminScope = String(req.query?.scope || "").toLowerCase() === "admin";
    const auth = isAdminScope
      ? await verifyAuth(req, ["super_admin", "admin_fitur"], "admin")
      : await verifyAuth(req, ["user"], "user");

    if (!auth.ok) return res.status(401).json({ error: "Unauthorized" });

    const requestedUserId = req.query.userId ? Number(req.query.userId) : null;
    const listForUserId =
      isAdminScope && Number.isFinite(requestedUserId) && requestedUserId > 0
        ? requestedUserId
        : !isAdminScope
        ? auth.userId
        : null;

    const { bookingId, status } = req.query;

    try {
      const queryParams = [];
      const where = [];

      if (bookingId) {
        where.push("b.id = ?");
        queryParams.push(bookingId);
      }
      if (listForUserId) {
        where.push("b.user_id = ?");
        queryParams.push(listForUserId);
      }
      if (status === "pending") where.push("b.status_id = 1");
      if (status === "finished") where.push("b.status_id = 4");

      const whereSQL = where.length ? "WHERE " + where.join(" AND ") : "";

      const query = `
        SELECT
          b.*,
          u.name AS user_name,
          CONCAT(
            '[',
            IF(
              COUNT(vt.id) > 0,
              GROUP_CONCAT(DISTINCT JSON_OBJECT('id', vt.id, 'name', vt.name, 'quantity', bv.quantity)),
              ''
            ),
            ']'
          ) AS vehicle_types
        FROM bidrive_bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN bidrive_booking_vehicle_types bv ON b.id = bv.booking_id
        LEFT JOIN bidrive_vehicle_types vt ON bv.vehicle_type_id = vt.id
        ${whereSQL}
        GROUP BY b.id
        ORDER BY b.created_at DESC
      `;

      const [results] = await db.query(query, queryParams);

      if (bookingId && results.length === 0) {
        return res.status(404).json({ error: "Booking tidak ditemukan." });
      }

      const processedResults = results.map((booking) => {
        let parsedVehicleTypes = [];
        try {
          if (booking.vehicle_types && booking.vehicle_types.length > 2) {
            parsedVehicleTypes = JSON.parse(booking.vehicle_types);
          }
        } catch {
          parsedVehicleTypes = [];
        }
        return {
          ...booking,
          vehicle_types: Array.isArray(parsedVehicleTypes)
            ? parsedVehicleTypes.filter((vt) => vt && vt.id !== null)
            : [],
        };
      });

      return res.status(200).json(bookingId ? [processedResults[0]] : processedResults);
    } catch (error) {
      console.error("Get Bookings API Error:", error);
      return res.status(500).json({ error: "Gagal mengambil data booking.", details: error.message });
    }
  }

  // ===================== PUT =====================
  if (req.method === "PUT") {
    const auth = await verifyAuth(req, ["user", "super_admin", "admin_fitur"], "user");
    if (!auth.ok) return res.status(401).json({ error: "Unauthorized" });

    const { bookingId, newStatusId } = req.body;
    if (!bookingId || !newStatusId) {
      return res.status(400).json({ error: "Booking ID dan Status baru diperlukan." });
    }

    try {
      const [[own]] = await db.query(
        "SELECT id, user_id FROM bidrive_bookings WHERE id = ? LIMIT 1",
        [bookingId]
      );
      if (!own) return res.status(404).json({ error: "Booking tidak ditemukan" });

      if (auth.role === "user" && String(own.user_id) !== String(auth.userId)) {
        return res.status(403).json({ error: "Booking bukan milik Anda" });
      }

      const query = "UPDATE bidrive_bookings SET status_id = ? WHERE id = ?";
      const [result] = await db.query(query, [newStatusId, bookingId]);

      if (result.affectedRows === 0) {
        return res.status(409).json({ error: "Tidak ada baris yang berubah" });
      }

      return res.status(200).json({ message: "Status booking berhasil diperbarui." });
    } catch (error) {
      console.error("Update Booking Status Error:", error);
      return res.status(500).json({ error: "Gagal memperbarui status booking.", details: error.message });
    }
  }

  // ===================== POST (create booking) =====================
  if (req.method === "POST") {
    const isAdminScope = String(req.query?.scope || "").toLowerCase() === "admin";
    const auth = isAdminScope
      ? await verifyAuth(req, ["super_admin", "admin_fitur"], "admin")
      : await verifyAuth(req, ["user"], "user");

    if (!auth.ok) return res.status(401).json({ error: "Unauthorized" });

    const {
      user_id,
      tujuan,
      jumlah_orang,
      jumlah_kendaraan,
      volume_kg,
      start_date,
      end_date,
      phone,
      keterangan,
      file_link,
      vehicle_details,
      jumlah_driver,
    } = req.body;

    const finalUserId = !isAdminScope ? auth.userId : (user_id || auth.userId);

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const bookingQuery = `
        INSERT INTO bidrive_bookings
          (user_id, status_id, tujuan, jumlah_orang, jumlah_kendaraan, volume_kg,
           start_date, end_date, phone, keterangan, file_link, jumlah_driver)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const bookingValues = [
        finalUserId,
        1,
        tujuan,
        jumlah_orang,
        jumlah_kendaraan,
        volume_kg,
        start_date,
        end_date,
        phone,
        keterangan,
        file_link,
        jumlah_driver,
      ];

      const [result] = await connection.query(bookingQuery, bookingValues);
      const newBookingId = result.insertId;

      const { query: typesQuery, values: typesValues } =
        formatInsertBookingVehicleTypes(newBookingId, vehicle_details);

      if (typesQuery) {
        await connection.query(typesQuery, typesValues);
      }

      await connection.commit();
      return res.status(201).json({ id: newBookingId, message: "Booking berhasil dibuat." });
    } catch (error) {
      await connection.rollback();
      console.error("Booking API Error (Transaction):", error);
      return res.status(500).json({ error: "Gagal menyimpan data booking.", details: error.message });
    } finally {
      connection.release();
    }
  }

  res.setHeader("Allow", ["GET", "POST", "PUT"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
