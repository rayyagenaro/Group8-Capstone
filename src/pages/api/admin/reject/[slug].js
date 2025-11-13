import db from '@/lib/db';

const MAP = {
  // === pakai numeric status_id ===
  bidrive:  { table: 'bidrive_bookings', idField: 'id', statusField: 'status_id', rejectField: 'rejection_reason' },
  bimeet: { table: 'bimeet_bookings', idField: 'id', statusField: 'status_id', rejectField: 'reject_reason' },
  bistay: { table: 'bistay_bookings', idField: 'id', statusField: 'status_id', rejectField: 'reject_reason' },
  bimeal: { table: 'bimeal_bookings', idField: 'id', statusField: 'status_id', rejectField: null }, // kalau mau simpan alasan, buat kolom lalu isi nama kolom di sini

  // === contoh yang pakai status string (jika dipakai) ===
  // bicare: { table: 'bicare_bookings', idField: 'id', statusField: 'status', rejectField: 'reject_reason', statusRejectedValue: 'Rejected' },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (slug === 'bimail') return res.status(400).json({ error: 'BI-DOCS tidak menggunakan endpoint ini' });

    const cfg = MAP[slug];
    if (!cfg) return res.status(404).json({ error: `Unsupported slug: ${slug}` });

    const id = Number(req.body?.id);
    const reason = String(req.body?.reason || '').trim();
    if (!id) return res.status(400).json({ error: 'Param id wajib & numerik' });
    if (!reason) return res.status(400).json({ error: 'Alasan (reason) wajib diisi' });

    const rejectedVal = cfg.statusRejectedValue ?? 3;

    let sql, params;
    if (cfg.rejectField) {
      sql = `
        UPDATE ${cfg.table}
           SET ${cfg.statusField} = ?,
               ${cfg.rejectField} = ?,
               updated_at = NOW()
         WHERE ${cfg.idField} = ?
         LIMIT 1
      `;
      params = [rejectedVal, reason, id];
    } else {
      // tabel belum punya kolom alasan → tetap set status jadi Rejected
      sql = `
        UPDATE ${cfg.table}
           SET ${cfg.statusField} = ?,
               updated_at = NOW()
         WHERE ${cfg.idField} = ?
         LIMIT 1
      `;
      params = [rejectedVal, id];
    }

    const [result] = await db.execute(sql, params);
    if (!result?.affectedRows) return res.status(404).json({ error: 'Data tidak ditemukan' });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('POST /api/admin/reject error:', e);
    return res.status(500).json({ error: 'Gagal memproses penolakan' });
  }
}
