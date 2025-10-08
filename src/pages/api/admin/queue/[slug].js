// /src/pages/api/admin/queue/[slug].js
import db from '@/lib/db';

/**
 * Konfigurasi per layanan
 * - from: bisa pakai alias "b" dan join seperlunya
 * - select: kolom yang ditampilkan ke UI
 * - defaultOrder: ORDER BY yang dipakai (wajib sertakan "ORDER BY ...")
 * - groupBy: (opsional) daftar kolom non-agregat untuk GROUP BY jika select berisi agregasi
 * - pendingWhere: kondisi untuk "pending/masuk". Jika null -> anggap semua.
 */
const CFG = {
  bidrive: {
    from: 'bidrive_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bidrive_bookings b',
    select: 'b.id, b.tujuan, b.start_date, b.end_date, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: 'b.status_id = 1'
  },

  bicare: {
    from: 'bicare_bookings b',
    tableForCount: 'bicare_bookings b',
    select: "b.id, b.booking_date, b.slot_time, b.status, b.booker_name, b.patient_name, b.created_at",
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: "b.status = 'Booked'"
  },

  bimeal: {
    from: `
      bimeal_bookings b
      LEFT JOIN booking_statuses s ON s.id = b.status_id
    `,
    tableForCount: 'bimeal_bookings b',
    select: `
      b.id,
      b.nama_pic,
      b.nama_pic_tagihan,
      b.no_wa_pic,
      b.unit_kerja,
      b.waktu_pesanan,
      b.status_id,
      s.name AS status_name,
      b.created_at
    `,
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: 'b.status_id = 1'
  },


  bimeet: {
    from: 'bimeet_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bimeet_bookings b',
    select: 'b.id, b.title, b.start_datetime, b.end_datetime, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: '(b.status_id IS NULL OR b.status_id = 1)'
  },

  bimail: {
    from: 'bimail_docs b',
    tableForCount: 'bimail_docs b',
    select: 'b.id, b.nomor_surat, b.tanggal_dokumen, b.perihal, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: null // tidak ada status -> treat as ALL
  },

  bistay: {
    from: `
      bistay_bookings b
      LEFT JOIN booking_statuses s ON s.id = b.status_id
    `,
    tableForCount: 'bistay_bookings b',
    select: `
      b.id,
      b.nama_pemesan,
      b.check_in,
      b.check_out,
      b.status_id,
      s.name AS status_name,
      b.created_at
    `,
    defaultOrder: 'ORDER BY b.created_at DESC',
    // anggap pending = 1 (boleh tambahkan 0/NULL jika ada sistem lama)
    pendingWhere: '(b.status_id IS NULL OR b.status_id IN (0,1))'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    const cfg = CFG[slug];
    if (!cfg) return res.status(404).json({ error: 'Unknown service' });

    // pagination & filter
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.perPage || '10', 10)));
    const status = (req.query.status || 'pending').toLowerCase(); // 'pending' | 'all'

    // layanan tanpa tabel -> kosong saja
    if (!cfg.from) {
      return res.status(200).json({ items: [], total: 0, page, perPage });
    }

    const whereParts = [];
    if (status === 'pending' && cfg.pendingWhere) {
      whereParts.push(cfg.pendingWhere);
    }
    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    // total (hitung di tabel utama saja)
    const [[{ cnt: total }]] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM ${cfg.tableForCount} ${whereSQL}`
    );

    // data
    const offset = (page - 1) * perPage;
    const groupSQL = cfg.groupBy ? `GROUP BY ${cfg.groupBy}` : '';
    const orderSQL = cfg.defaultOrder ? `${cfg.defaultOrder}` : '';
    const [rows] = await db.execute(
      `SELECT ${cfg.select} FROM ${cfg.from} ${whereSQL} ${groupSQL} ${orderSQL} LIMIT ? OFFSET ?`,
      [perPage, offset]
    );

    res.status(200).json({ items: rows, total, page, perPage });
  } catch (e) {
    console.error('queue API error:', e);
    res.status(500).json({ error: 'Gagal mengambil data antrian' });
  }
}
