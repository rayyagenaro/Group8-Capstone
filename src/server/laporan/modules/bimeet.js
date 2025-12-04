// BI.MEET — tabel: bimeet_bookings
// kolom: id,user_id,status_id,start_datetime,end_datetime,room_id,unit_kerja,title,description,participants,contact_phone,pic_name,reject_reason,created_at,updated_at

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
  filenamePrefix: 'bi-meet',
  columns: [
    { header: 'ID',             key: 'id',             width: 8 },
    { header: 'Start',          key: 'start_datetime', width: 20 },
    { header: 'End',            key: 'end_datetime',   width: 20 },
    { header: 'Status',         key: 'status_name',    width: 12 },
    { header: 'Room ID',        key: 'room_id',        width: 10 },
    { header: 'Unit Kerja',     key: 'unit_kerja',     width: 20 },
    { header: 'Title',          key: 'title',          width: 24 },
    { header: 'Description',    key: 'description',    width: 28 },
    { header: 'Participants',   key: 'participants',   width: 12 },
    { header: 'Contact Phone',  key: 'contact_phone',  width: 16 },
    { header: 'PIC Name',       key: 'pic_name',       width: 18 },
    { header: 'Reject Reason',  key: 'reject_reason',  width: 24 },
    { header: 'Created At',     key: 'created_at',     width: 18 },
    { header: 'Updated At',     key: 'updated_at',     width: 18 },
  ],
  dateKeys: ['start_datetime', 'end_datetime', 'created_at', 'updated_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];
  // beberapa baris di datamu start/end-nya NULL → pakai COALESCE ke created_at
  if (fromYMD) { where.push('COALESCE(DATE(b.start_datetime), DATE(b.created_at)) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('COALESCE(DATE(b.start_datetime), DATE(b.created_at)) <= ?'); params.push(toYMD); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      b.id,
      b.start_datetime,
      b.end_datetime,
      b.status_id,
      b.room_id,
      b.unit_kerja_id,
      u.unit_kerja AS unit_kerja,
      b.title,
      b.description,
      b.participants,
      b.contact_phone,
      b.pic_name,
      b.reject_reason,
      b.created_at,
      b.updated_at
    FROM bimeet_bookings b
    LEFT JOIN unit_kerja u ON b.unit_kerja_id = u.id
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;
  const [raw] = await db.query(sql, params);
  const rows = raw.map(r => ({ ...r, status_name: statusName(r.status_id) }));
  return { columns: excel.columns.map(({ header, key }) => ({ header, key })), rows };
}
