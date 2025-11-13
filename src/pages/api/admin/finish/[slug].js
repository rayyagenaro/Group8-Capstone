import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const MAP = {
  bidrive: { table: 'bidrive_bookings', idField: 'id', statusField: 'status_id' },
  bimeet: { table: 'bimeet_bookings', idField: 'id', statusField: 'status_id' },
  bistay: { table: 'bistay_bookings', idField: 'id', statusField: 'status_id' },
  bimeal: { table: 'bimeal_bookings', idField: 'id', statusField: 'status_id' },
};

// Release driver & kendaraan BI-DRIVE
async function releaseBidriveResources(bookingId) {
  const [assignments] = await db.query(
    `SELECT driver_id, vehicle_id FROM bidrive_booking_assignments WHERE booking_id = ?`,
    [bookingId]
  );

  const driverIds = assignments.map(a => a.driver_id).filter(Boolean);
  const vehicleIds = assignments.map(a => a.vehicle_id).filter(Boolean);

  if (driverIds.length > 0) {
    await db.query('UPDATE bidrive_drivers SET driver_status_id = 1 WHERE id IN (?)', [driverIds]);
  }
  if (vehicleIds.length > 0) {
    await db.query('UPDATE bidrive_vehicles SET vehicle_status_id = 1 WHERE id IN (?)', [vehicleIds]);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const auth = await verifyAuth(req, ['super_admin', 'admin_fitur'], 'admin');
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    console.log('[FINISH API] slug:', slug);
    const cfg = MAP[slug];
    if (!cfg) return res.status(404).json({ error: `Unsupported slug: ${slug}` });

    const id = Number(req.body?.id);
    console.log('[FINISH API] bookingId:', id);
    if (!id) return res.status(400).json({ error: 'Param id wajib & numerik' });

    // release driver & vehicle kalau BI-DRIVE
    if (slug === 'dmove') {
      console.log('[FINISH API] Release resource for booking:', id);
      await releaseBidriveResources(id);
    }

    const finishedVal = 4; // 4 = Finished
    const sql = `
      UPDATE ${cfg.table}
         SET ${cfg.statusField} = ?,
             updated_at = NOW()
       WHERE ${cfg.idField} = ? AND ${cfg.statusField} = 2
       LIMIT 1
    `;
    console.log('[FINISH API] SQL:', sql, 'Params:', [finishedVal, id]);
    const [rows] = await db.query('SELECT DATABASE() AS db');
    console.log('[FINISH API] Connected to DB:', rows[0].db);

    const [cols] = await db.query(`SHOW COLUMNS FROM bidrive_bookings`);
    console.log('[FINISH API] Columns in bidrive_bookings:', cols.map(c => c.Field));

    const [result] = await db.execute(sql, [finishedVal, id]);
    console.log('[FINISH API] result:', result);

    if (!result?.affectedRows) {
      return res.status(404).json({ error: 'Data tidak ditemukan atau statusnya bukan "Approved".' });
    }

    return res.status(200).json({ ok: true, id, status_id: finishedVal });
  } catch (e) {
    console.error('POST /api/admin/finish error:', e);
    return res.status(500).json({ error: e.message || 'Gagal memproses finish' });
  }
}

