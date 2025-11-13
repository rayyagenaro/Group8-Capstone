// src/pages/api/admin/cancel/[slug].js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const MAP = {
  // dmove: { table: 'bidrive_bookings', idField: 'id', statusField: 'status_id', rejectField: 'rejection_reason' },
  bidrive: { table: 'bidrive_bookings', idField: 'id', statusField: 'status_id', rejectField: 'rejection_reason' },
  bimeet: { table: 'bimeet_bookings', idField: 'id', statusField: 'status_id', rejectField: 'reject_reason' },
  bistay: { table: 'bistay_bookings', idField: 'id', statusField: 'status_id', rejectField: 'reject_reason' },
  bimeal: { table: 'bimeal_bookings', idField: 'id', statusField: 'status_id', rejectField: 'reject_reason' },
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
    if (slug === 'bimail' || slug === 'bicare') {
      return res.status(400).json({ error: `${slug} tidak mendukung cancel booking.` });
    }

    const cfg = MAP[slug];
    if (!cfg) return res.status(404).json({ error: `Unsupported slug: ${slug}` });

    const id = Number(req.body?.id);
    const reason = String(req.body?.reason || '').trim();
    if (!id) return res.status(400).json({ error: 'Param id wajib & numerik' });
    if (!reason) return res.status(400).json({ error: 'Alasan pembatalan (reason) wajib diisi' });

    // release driver & vehicle
    if (slug === 'bidrive') {
      await releaseBidriveResources(id);
    }

    const cancelledVal = 5; // 5 = Cancelled
    const sql = `
      UPDATE ${cfg.table}
         SET ${cfg.statusField} = ?,
             ${cfg.rejectField} = ?,
             updated_at = NOW()
       WHERE ${cfg.idField} = ? AND ${cfg.statusField} = 2
       LIMIT 1
    `;
    const [result] = await db.execute(sql, [cancelledVal, reason, id]);

    if (!result?.affectedRows) {
      return res.status(404).json({ error: 'Data tidak ditemukan atau statusnya bukan "Approved".' });
    }

    return res.status(200).json({ ok: true, id, status_id: cancelledVal, reason });
  } catch (e) {
    console.error('POST /api/admin/cancel error:', e);
    return res.status(500).json({ error: 'Gagal memproses pembatalan' });
  }
}
