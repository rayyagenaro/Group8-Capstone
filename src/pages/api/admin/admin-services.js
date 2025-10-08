// pages/api/admin/admin-services.js
import db from '@/lib/db';

const ALLOW_4_DOMAINS = new Set(['umi.com']); // domain spesial

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const adminId = req.query.adminId ? Number(req.query.adminId) : null;

      // layanan milik admin tertentu
      if (adminId) {
        const [adminRows] = await db.query(
          'SELECT id, role_id FROM admins WHERE id = ? LIMIT 1',
          [adminId]
        );
        if (!adminRows.length) return res.status(404).json({ error: 'Admin tidak ditemukan' });

        const [rows] = await db.query(
          `
            SELECT s.id, s.name
            FROM admin_services asg
            JOIN services s ON s.id = asg.service_id
            WHERE asg.admin_id = ?
            ORDER BY s.name ASC
          `,
          [adminId]
        );

        return res.status(200).json({ adminId, services: rows });
      }

      // semua layanan
      const [rows] = await db.query('SELECT id, name FROM services ORDER BY name ASC');
      return res.status(200).json(rows);
    }

    if (req.method === 'PUT') {
      const { adminId, serviceIds } = req.body || {};
      const aId = Number(adminId);

      if (!aId) return res.status(400).json({ error: 'adminId wajib diisi' });
      if (!Array.isArray(serviceIds)) {
        return res.status(400).json({ error: 'serviceIds harus array of number' });
      }

      // validasi admin & cegah edit super admin
      const [adminRows] = await db.query(
        'SELECT id, role_id, email FROM admins WHERE id = ? LIMIT 1',
        [aId]
      );
      if (!adminRows.length) return res.status(404).json({ error: 'Admin tidak ditemukan' });
      if (Number(adminRows[0].role_id) === 1) {
        return res.status(403).json({ error: 'Akses Super Admin tidak dapat diubah' });
      }

      // tentukan batas max berdasarkan domain
      const domain = String(adminRows[0].email || '').split('@')[1]?.toLowerCase() || '';
      const maxAllowed = ALLOW_4_DOMAINS.has(domain) ? 4 : 2;

      // bersihkan & validasi ids
      let validIds = [...new Set(serviceIds.map(Number).filter(Boolean))];
      if (validIds.length < 1 || validIds.length > maxAllowed) {
        return res.status(400).json({
          error: `Admin dengan domain ${domain || '(unknown)'} harus memiliki 1–${maxAllowed} layanan.`,
        });
      }

      // pastikan id layanan valid
      const [sv] = await db.query(
        `SELECT id FROM services WHERE id IN (${validIds.map(() => '?').join(',')})`,
        validIds
      );
      const set = new Set(sv.map(r => r.id));
      validIds = validIds.filter(id => set.has(id));

      // transaksi: kosongkan -> isi ulang
      await db.query('START TRANSACTION');
      try {
        await db.query('DELETE FROM admin_services WHERE admin_id = ?', [aId]);

        if (validIds.length) {
          const placeholders = validIds.map(() => '(?,?)').join(',');
          const params = validIds.flatMap(id => [aId, id]);
          await db.query(
            `INSERT INTO admin_services (admin_id, service_id) VALUES ${placeholders}`,
            params
          );
        }

        await db.query('COMMIT');
      } catch (e) {
        await db.query('ROLLBACK');
        throw e;
      }

      // kembalikan daftar nama layanan terbaru
      const [rows] = await db.query(
        `
          SELECT s.id, s.name
          FROM admin_services asg
          JOIN services s ON s.id = asg.service_id
          WHERE asg.admin_id = ?
          ORDER BY s.name ASC
        `,
        [aId]
      );

      return res.status(200).json({ adminId: aId, services: rows });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (e) {
    console.error('[/api/admin/admin-services] error:', e);
    return res.status(500).json({ error: 'Terjadi kesalahan server' });
  }
}
