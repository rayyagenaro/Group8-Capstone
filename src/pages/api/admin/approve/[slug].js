import db from '@/lib/db';

const MAP = {
  // 2 = Approved
  bimeal: { table: 'bimeal_bookings', whereId: 'id', setSql: 'status_id = 2, updated_at = NOW()' },
  bimeet: { table: 'bimeet_bookings', whereId: 'id', setSql: 'status_id = 2, updated_at = NOW()' },
  bistay: { table: 'bistay_bookings', whereId: 'id', setSql: 'status_id = 2, updated_at = NOW()' }, // pastikan ada kolom status_id (lihat catatan SQL di bawah)
  // tambahkan mapping lain kalau perlu (mis: bicare) dengan pola yang sama
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const { slug } = req.query;
  const { id } = req.body || {};
  const key = String(slug || '').toLowerCase();

  // BI-DOCS tidak ikut approval generic
  if (key === 'bimail') return res.status(400).json({ error: 'BI-DOCS tidak menggunakan endpoint ini' });

  const cfg = MAP[key];
  if (!cfg) return res.status(404).json({ error: `Unsupported slug: ${slug}` });
  if (!id || Number.isNaN(Number(id))) return res.status(400).json({ error: 'Param id wajib & harus numerik' });

  try {
    const [result] = await db.query(
      `UPDATE ${cfg.table} SET ${cfg.setSql} WHERE ${cfg.whereId} = ? LIMIT 1`,
      [Number(id)]
    );
    if (!result?.affectedRows) return res.status(404).json({ error: 'Data tidak ditemukan' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    // Biasanya kalau kolom belum ada (mis. bistay.status_id) -> ER_BAD_FIELD_ERROR
    console.error('POST /api/admin/approve error:', e);
    return res.status(500).json({ error: e.message });
  }
}
