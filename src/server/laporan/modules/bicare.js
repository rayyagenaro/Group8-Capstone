// Adapter BI.CARE – cocok dengan tabel yang kamu tunjukkan
// Tabel: bicare_bookings (id,user_id,doctor_id,booking_date,slot_time,status,booker_name,nip,wa,patient_name,patient_status,gender,birth_date,complaint,created_at)

export const excel = {
  filenamePrefix: 'bi-care',
  // urutan & header kolom untuk FE + Excel
  columns: [
    { header: 'ID',               key: 'id',             width: 8 },
    { header: 'Booking Date',     key: 'booking_date',   width: 14 },
    { header: 'Slot Time',        key: 'slot_time',      width: 12 },
    { header: 'Status',           key: 'status',         width: 12 },
    { header: 'Booker Name',      key: 'booker_name',    width: 20 },
    { header: 'NIP',              key: 'nip',            width: 16 },
    { header: 'WA',               key: 'wa',             width: 16 },
    { header: 'Patient Name',     key: 'patient_name',   width: 20 },
    { header: 'Patient Status',   key: 'patient_status', width: 14 },
    { header: 'Jenis Kelamin',    key: 'jenis_kelamin',width: 10 },
    { header: 'Birth Date',       key: 'birth_date',     width: 14 },
    { header: 'Complaint',        key: 'complaint',      width: 28 },
    { header: 'Created At',       key: 'created_at',     width: 18 },
    { header: 'Doctor Name',      key: 'doc_name',     width: 18 },
  ],
  dateKeys: ['booking_date', 'birth_date', 'created_at', 'slot_time'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];

  if (fromYMD) { where.push('b.booking_date >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('b.booking_date <= ?'); params.push(toYMD); }

  const whereSQL = where.length ? ('WHERE ' + where.join(' AND ')) : '';
  const sql = `
    SELECT
      b.id,
      b.booking_date,
      b.slot_time,
      b.status,
      b.booker_name,
      b.nip,
      b.wa,
      b.patient_name,
      b.patient_status,
      b.jenis_kelamin_id,
      j.jenis_kelamin AS jenis_kelamin,
      b.birth_date,
      b.complaint,
      b.created_at,
      d.name AS doc_name
    FROM bicare_bookings b
    LEFT JOIN jenis_kelamin j ON b.jenis_kelamin_id = j.id
    LEFT JOIN bicare_doctors d ON b.doctor_id = d.id
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;

  const [rows] = await db.query(sql, params);

  return {
    columns: excel.columns.map(({ header, key }) => ({ header, key })),
    rows,
  };
}
