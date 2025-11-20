// BI.MEAL — tabel: bimeal_bookings
// kolom: id,user_id,nama_pic,nama_pic_tagihan,no_wa_pic,unit_kerja,waktu_pesanan,status_id,reject_reason,keterangan,lokasi_pengiriman,created_at,updated_at

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
  filenamePrefix: 'bi-meal',
  columns: [
    { header: 'ID',                 key: 'id',                 width: 8 },
    { header: 'Waktu Pesanan',      key: 'waktu_pesanan',      width: 18 },
    { header: 'Status',             key: 'status_name',        width: 12 },
    { header: 'PIC',                key: 'nama_pic',           width: 18 },
    { header: 'NIP PIC',            key: 'nip_pic',            width: 16 }, // tidak ada di tabel -> akan NULL
    { header: 'WA PIC',             key: 'no_wa_pic',          width: 16 },
    { header: 'Unit Kerja',         key: 'unit_kerja',         width: 18 },
    { header: 'Nama PIC Tagihan',   key: 'nama_pic_tagihan',   width: 18 },
    { header: 'Keterangan',         key: 'keterangan',         width: 24 },
    { header: 'Lokasi Pengiriman',  key: 'lokasi_pengiriman',  width: 18 },
    { header: 'Reject Reason',      key: 'reject_reason',      width: 24 },
    { header: 'Created At',         key: 'created_at',         width: 18 },
    { header: 'Updated At',         key: 'updated_at',         width: 18 },
  ],
  dateKeys: ['waktu_pesanan', 'created_at', 'updated_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];
  if (fromYMD) { where.push('DATE(b.waktu_pesanan) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('DATE(b.waktu_pesanan) <= ?'); params.push(toYMD); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      b.id,
      b.waktu_pesanan,
      b.status_id,
      b.nama_pic,
      NULL AS nip_pic,              
      b.no_wa_pic,
      b.unit_kerja_id,
      u.unit_kerja AS unit_kerja,
      b.nama_pic_tagihan,
      b.keterangan,
      b.lokasi_pengiriman,
      b.reject_reason,
      b.created_at,
      b.updated_at
    FROM bimeal_bookings b
    LEFT JOIN unit_kerja u ON b.unit_kerja_id = u.id
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
