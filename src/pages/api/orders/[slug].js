// src/pages/api/orders/[slug].js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

const CFG = {
  bidrive: {
    from: 'bidrive_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bidrive_bookings b',
    userFilterColumn: 'b.user_id',
    select:
      'b.id, b.tujuan, b.start_date, b.end_date, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: 'b.status_id = 1',
    approvedWhere: 'b.status_id = 2',
  },

  bicare: {
    from: 'bicare_bookings b',
    tableForCount: 'bicare_bookings b',
    userFilterColumn: 'b.user_id',
    select:
      "b.id, b.booking_date, b.slot_time, b.status, b.booker_name, b.patient_name, b.created_at",
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: "b.status = 'Booked'",
  },

  // ✅ FIX BIMEAL: pakai langsung b.unit_kerja (varchar), tanpa join ke unit_kerja
  bimeal: {
    from: `
      bimeal_bookings b
      LEFT JOIN booking_statuses s ON s.id = b.status_id
    `,
    tableForCount: 'bimeal_bookings b',
    userFilterColumn: 'b.user_id',
    select: `
      b.id,
      b.nama_pic,
      b.unit_kerja,
      b.waktu_pesanan,
      b.status_id,
      s.name AS status_name,
      b.created_at
    `,
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: 'b.status_id = 1',
    approvedWhere: 'b.status_id = 2',
  },

  bimeet: {
    from: 'bimeet_bookings b LEFT JOIN booking_statuses s ON s.id = b.status_id',
    tableForCount: 'bimeet_bookings b',
    userFilterColumn: 'b.user_id',
    select:
      'b.id, b.title, b.start_datetime, b.end_datetime, b.status_id, s.name AS status_name, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: '(b.status_id IS NULL OR b.status_id = 1)',
    approvedWhere: 'b.status_id = 2',
  },

  bimail: {
    from: 'bimail_docs b',
    tableForCount: 'bimail_docs b',
    userFilterColumn: 'b.user_id', // asumsi ada kolom user_id
    select: 'b.id, b.nomor_surat, b.tanggal_dokumen, b.perihal, b.created_at',
    defaultOrder: 'ORDER BY b.created_at DESC',
    pendingWhere: null,
  },

  bistay: {
    from: `
      bistay_bookings b
      LEFT JOIN booking_statuses s ON s.id = b.status_id
    `,
    tableForCount: 'bistay_bookings b',
    userFilterColumn: 'b.user_id',
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
    pendingWhere: 'b.status_id = 1',
    approvedWhere: 'b.status_id = 2',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verifikasi auth (user)
  const auth = await verifyAuth(req, ['user']);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }
  const userId = auth.userId;
  if (!userId) {
    return res
      .status(401)
      .json({ error: 'Unauthorized', reason: 'User ID not found in session' });
  }

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    const cfg = CFG[slug];
    if (!cfg) {
      return res.status(404).json({ error: 'Unknown service' });
    }

    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const perPage = Math.min(50, Math.max(1, parseInt(req.query.perPage || '10', 10)));
    const status = (req.query.status || 'pending').toLowerCase();

    const queryParams = [];
    const whereParts = [];

    if (cfg.userFilterColumn) {
      whereParts.push(`${cfg.userFilterColumn} = ?`);
      queryParams.push(userId);
    }

    if (status === 'pending' && cfg.pendingWhere) {
      whereParts.push(cfg.pendingWhere);
    } else if (status === 'approved' && cfg.approvedWhere) {
      whereParts.push(cfg.approvedWhere);
    } else if (
      status === 'pending_or_approved' &&
      cfg.pendingWhere &&
      cfg.approvedWhere
    ) {
      whereParts.push(`(${cfg.pendingWhere} OR ${cfg.approvedWhere})`);
    }

    const whereSQL = whereParts.length ? `WHERE ${whereParts.join(' AND ')}` : '';

    if (!cfg.from) {
      return res.status(200).json({ items: [], total: 0, page, perPage });
    }

    // hitung total
    const [[{ cnt: total }]] = await db.execute(
      `SELECT COUNT(*) AS cnt FROM ${cfg.tableForCount} ${whereSQL}`,
      queryParams
    );

    const offset = (page - 1) * perPage;
    const groupSQL = cfg.groupBy ? `GROUP BY ${cfg.groupBy}` : '';
    const orderSQL = cfg.defaultOrder ? `${cfg.defaultOrder}` : '';

    // ambil data
    const [rows] = await db.execute(
      `SELECT ${cfg.select} FROM ${cfg.from} ${whereSQL} ${groupSQL} ${orderSQL} LIMIT ? OFFSET ?`,
      [...queryParams, perPage, offset]
    );

    return res.status(200).json({ items: rows, total, page, perPage });
  } catch (e) {
    console.error('queue API error:', e);
    return res.status(500).json({ error: 'Gagal mengambil data antrian' });
  }
}
