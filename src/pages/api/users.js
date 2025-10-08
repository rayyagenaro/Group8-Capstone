// /pages/api/users.js
import db from "@/lib/db";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  // ================== GET (pagination + filter verifikasi) ==================
  if (req.method === "GET") {
    try {
      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      // optional filter: verification = 1|2|3 atau pending|verified|rejected
      let verification = req.query.verification?.toString().trim().toLowerCase() || '';
      const map = { pending: 1, verified: 2, verificated: 2, reject: 3, rejected: 3 };
      verification = map[verification] || parseInt(verification) || null;

      let totalSql = "SELECT COUNT(*) AS totalItems FROM users";
      let dataSql  = `
        SELECT 
          u.id, u.name, u.email, u.phone, u.nip,                    
          u.verification_status_id,
          vs.name AS verification_status_name,
          u.rejection_reason
        FROM users u
        LEFT JOIN verification_status vs ON vs.id = u.verification_status_id
      `;
      const params = [];

      if (verification === 1 || verification === 2 || verification === 3) {
        totalSql += " WHERE verification_status_id = ?";
        dataSql  += " WHERE u.verification_status_id = ?";
        params.push(verification);
      }

      dataSql += " ORDER BY u.id ASC LIMIT ? OFFSET ?";

      const totalParams = verification ? [verification] : [];
      const [[{ totalItems }]] = await db.query(totalSql, totalParams);
      const [users] = await db.query(dataSql, [...params, limit, offset]);

      const totalPages = Math.ceil(totalItems / limit);
      return res.status(200).json({
        data: users,
        pagination: { totalItems, totalPages, currentPage: page, itemsPerPage: limit },
      });
    } catch (err) {
      console.error("API GET Error:", err);
      return res.status(500).json({ error: "Gagal mengambil data user." });
    }
  }

  // ================== PUT (edit profile / ganti password oleh admin) ==================
  if (req.method === "PUT") {
    const { id, name, phone, password, adminPassword, emailAdmin } = req.body;

    if (name && phone && id && !password) {
      try {
        await db.query("UPDATE users SET name = ?, phone = ? WHERE id = ?", [name, phone, id]);
        return res.status(200).json({ message: "User berhasil diupdate" });
      } catch {
        return res.status(500).json({ error: "Gagal update user." });
      }
    }

    if (password && id && adminPassword && emailAdmin) {
      try {
        const [adminRows] = await db.query(
          "SELECT password FROM admins WHERE email = ? LIMIT 1",
          [emailAdmin]
        );
        if (!adminRows?.length) {
          return res.status(400).json({ error: "Email admin tidak ditemukan. Hubungi developer." });
        }
        const ok = await bcrypt.compare(adminPassword, adminRows[0].password);
        if (!ok) return res.status(401).json({ error: "Password admin salah." });

        const newHash = await bcrypt.hash(password, 10);
        await db.query("UPDATE users SET password = ? WHERE id = ?", [newHash, id]);
        return res.status(200).json({ message: "Password user berhasil diupdate" });
      } catch {
        return res.status(500).json({ error: "Gagal update password user." });
      }
    }

    return res.status(400).json({ error: "Data tidak lengkap." });
  }

  res.setHeader("Allow", ["GET", "PUT"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
}
