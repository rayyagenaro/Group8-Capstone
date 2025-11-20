function statusName(id) {
  switch (Number(id)) {
    case 1: return 'Pending';
    case 2: return 'Approved';
    case 3: return 'Rejected';
    case 4: return 'Finished';
    case 5: return 'Cancelled';
    default: return `Status-${id}`;
  }
}

export const excel = {
  filenamePrefix: 'bi-drive',
  columns: [
    { header: 'ID',                key: 'id',                 width: 8  },
    { header: 'Start Date',        key: 'start_date',         width: 16 },
    { header: 'End Date',          key: 'end_date',           width: 16 },
    { header: 'Status',            key: 'status_name',        width: 12 },
    { header: 'Tujuan',            key: 'tujuan',             width: 20 },
    { header: 'Jml Orang',         key: 'jumlah_orang',       width: 10 },
    { header: 'Jml Kendaraan',     key: 'jumlah_kendaraan',   width: 14 },
    { header: 'Volume (kg)',       key: 'volume_kg',          width: 12 },
    { header: 'Jml Driver',        key: 'jumlah_driver',      width: 10 },
    { header: 'Driver',            key: 'driver_names',       width: 28 }, // NEW
    { header: 'Kendaraan',         key: 'vehicle_plates',     width: 24 }, // NEW
    { header: 'Phone',             key: 'phone',              width: 16 },
    { header: 'Keterangan',        key: 'keterangan',         width: 24 },
    { header: 'File Link',         key: 'file_link',          width: 24 },
    { header: 'Rejection Reason',  key: 'rejection_reason',   width: 24 },
    { header: 'Created At',        key: 'created_at',         width: 18 },
    { header: 'Updated At',        key: 'updated_at',         width: 18 },
  ],
  dateKeys: ['start_date', 'end_date', 'created_at', 'updated_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];
  if (fromYMD) { where.push('DATE(b.start_date) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('DATE(b.start_date) <= ?'); params.push(toYMD); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  // --- aggregate assignment per booking
  const sql = `
    SELECT
      b.id,
      b.start_date,
      b.end_date,
      b.status_id,
      b.tujuan,
      b.jumlah_orang,
      b.jumlah_kendaraan,
      b.volume_kg,
      b.jumlah_driver,
      b.phone,
      b.keterangan,
      b.file_link,
      b.rejection_reason,
      b.created_at,
      b.updated_at,
      COALESCE(dr.driver_names, '')  AS driver_names,
      COALESCE(vh.vehicle_plates, '') AS vehicle_plates
    FROM bidrive_bookings b
    /* daftar driver per booking */
    LEFT JOIN (
      SELECT ba.booking_id,
             GROUP_CONCAT(d.name ORDER BY d.name SEPARATOR ', ') AS driver_names
      FROM bidrive_booking_assignments ba
      JOIN bidrive_drivers d ON d.id = ba.driver_id
      GROUP BY ba.booking_id
    ) dr ON dr.booking_id = b.id
    /* daftar plat kendaraan per booking */
    LEFT JOIN (
      SELECT ba.booking_id,
             GROUP_CONCAT(v.plat_nomor ORDER BY v.plat_nomor SEPARATOR ', ') AS vehicle_plates
      FROM bidrive_booking_assignments ba
      JOIN bidrive_vehicles v ON v.id = ba.vehicle_id
      GROUP BY ba.booking_id
    ) vh ON vh.booking_id = b.id
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;

  const [raw] = await db.query(sql, params);
  const rows = raw.map(r => ({ ...r, status_name: statusName(r.status_id) }));

  return {
    columns: excel.columns.map(({ header, key }) => ({ header, key })),
    rows,
  };
}
