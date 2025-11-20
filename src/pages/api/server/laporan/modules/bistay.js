// BI.STAY — tabel: bistay_bookings
// kolom: id,user_id,status_id,nama_pemesan,nip,no_wa,status_pegawai_id,asal_kpw,check_in,check_out,keterangan,reject_reason,created_at,updated_at

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
  filenamePrefix: 'bi-stay',
  columns: [
    { header: 'ID',               key: 'id',                width: 8 },
    { header: 'Check In',         key: 'check_in',          width: 18 },
    { header: 'Check Out',        key: 'check_out',         width: 18 },
    { header: 'Status',           key: 'status_name',       width: 12 },
    { header: 'Nama Pemesan',     key: 'nama_pemesan',      width: 18 },
    { header: 'NIP',              key: 'nip',               width: 16 },
    { header: 'No WA',            key: 'no_wa',             width: 16 },
    { header: 'Status Pegawai ID',key: 'status_pegawai_id', width: 14 },
    { header: 'Asal KPw',         key: 'asal_kpw',          width: 16 },
    { header: 'Keterangan',       key: 'keterangan',        width: 24 },
    { header: 'Reject Reason',    key: 'reject_reason',     width: 24 },
    { header: 'Created At',       key: 'created_at',        width: 18 },
    { header: 'Updated At',       key: 'updated_at',        width: 18 },
  ],
  dateKeys: ['check_in', 'check_out', 'created_at', 'updated_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];
  if (fromYMD) { where.push('DATE(b.check_in) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('DATE(b.check_in) <= ?'); params.push(toYMD); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      b.id,
      b.check_in,
      b.check_out,
      b.status_id,
      b.nama_pemesan,
      b.nip,
      b.no_wa,
      b.status_pegawai_id,
      b.asal_kpw,
      b.keterangan,
      b.reject_reason,
      b.created_at,
      b.updated_at
    FROM bistay_bookings b
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;
  const [raw] = await db.query(sql, params);
  const rows = raw.map(r => ({ ...r, status_name: statusName(r.status_id) }));
  return { columns: excel.columns.map(({ header, key }) => ({ header, key })), rows };
}
