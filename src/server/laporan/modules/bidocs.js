// BI.DOCS — tabel: bimail_docs (frontend: bidocs)
// kolom: id,user_id,jenis_id,tahun,nomor_urut,nomor_surat,tipe_dokumen,unit_code,wilayah_code,tanggal_dokumen,perihal,dari,kepada,link_dokumen,created_at

export const excel = {
  filenamePrefix: 'bi-docs',
  columns: [
    { header: 'ID',             key: 'id',              width: 8 },
    { header: 'Jenis ID',       key: 'jenis_id',        width: 10 },
    { header: 'Tahun',          key: 'tahun',           width: 8 },
    { header: 'Nomor Urut',     key: 'nomor_urut',      width: 10 },
    { header: 'Nomor Surat',    key: 'nomor_surat',     width: 24 },
    { header: 'Tipe Dokumen',   key: 'tipe_dokumen',    width: 14 },
    { header: 'Unit',           key: 'unit_code',       width: 12 },
    { header: 'Wilayah',        key: 'wilayah_code',    width: 12 },
    { header: 'Tanggal Dok.',   key: 'tanggal_dokumen', width: 14 },
    { header: 'Perihal',        key: 'perihal',         width: 28 },
    { header: 'Dari',           key: 'dari',            width: 18 },
    { header: 'Kepada',         key: 'kepada',          width: 18 },
    { header: 'Link',           key: 'link_dokumen',    width: 28 },
    { header: 'Created At',     key: 'created_at',      width: 18 },
  ],
  dateKeys: ['tanggal_dokumen', 'created_at'],
};

export async function preview({ db, fromYMD, toYMD }) {
  const where = [];
  const params = [];
  if (fromYMD) { where.push('DATE(b.tanggal_dokumen) >= ?'); params.push(fromYMD); }
  if (toYMD)   { where.push('DATE(b.tanggal_dokumen) <= ?'); params.push(toYMD); }
  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    SELECT
      b.id,
      b.jenis_id,
      b.tahun,
      b.nomor_urut,
      b.nomor_surat,
      b.tipe_dokumen,
      b.unit_code,
      b.wilayah_code,
      b.tanggal_dokumen,
      b.perihal,
      b.dari,
      b.kepada,
      b.link_dokumen,
      b.created_at
    FROM bimail_docs b
    ${whereSQL}
    ORDER BY b.id ASC
    LIMIT 10000
  `;
  const [rows] = await db.query(sql, params);
  return { columns: excel.columns.map(({ header, key }) => ({ header, key })), rows };
}
