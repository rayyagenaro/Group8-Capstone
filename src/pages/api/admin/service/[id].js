// /pages/api/admin/service/[id].js
import db from '@/lib/db';

const ID_TO_META = {
  1: { slug: 'bidrive',  logo: "/assets/D'MOVE.svg",    desc: 'Kelola antrian & pesanan layanan pengemudi.' },
  2: { slug: 'bicare', logo: "/assets/D'CARE.svg",    desc: 'Lihat pesanan janji klinik & approve/decline.' },
  3: { slug: 'bimeal', logo: "/assets/D'MEAL.svg",    desc: 'Pantau permintaan konsumsi & progres pemenuhan.' },
  4: { slug: 'bimeet', logo: "/assets/D'ROOM.svg",    desc: 'Review peminjaman ruang rapat & ketersediaan.' },
  // 5: { slug: 'bimail', logo: '/assets/D%27TRACK.svg', desc: 'Monitoring penomoran & pelacakan surat.' },
  6: { slug: 'bistay', logo: "/assets/D'REST.svg",    desc: 'Kelola reservasi akomodasi rumah dinas.' },
};

async function countPendingBySlug(slug) {
  switch (slug) {
    case 'bidrive': {
      const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM bidrive_bookings WHERE status_id = 1');
      return cnt;
    }
    case 'bicare': {
      const [[{ cnt }]] = await db.execute("SELECT COUNT(*) AS cnt FROM bicare_bookings WHERE status = 'booked'");
      return cnt;
    }
    case 'bimeet': {
      const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM bimeet_bookings WHERE status_id IS NULL OR status_id = 1');
      return cnt;
    }
    case 'bistay': {
      const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM bistay_bookings');
      return cnt;
    }
    case 'bimeal': {
      // ✅ samakan: kembalikan angka, bukan array rows
      const [[{ cnt }]] = await db.execute('SELECT COUNT(*) AS cnt FROM bimeal_bookings WHERE status_id = 1');
      return cnt;
    }
    default:
      return 0;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const id = Number(req.query.id);
    if (!id || !ID_TO_META[id]) return res.status(404).json({ error: 'Service not found' });

    const [rows] = await db.execute('SELECT id, name FROM services WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Service not found' });

    const meta = ID_TO_META[id];
    const pending = await countPendingBySlug(meta.slug);

    res.status(200).json({
      id: rows[0].id,
      name: rows[0].name,
      slug: meta.slug,
      logo: meta.logo,
      desc: meta.desc,
      pending, // selalu number/string -> aman untuk CardShell
    });
  } catch (e) {
    console.error('service-by-id error:', e);
    res.status(500).json({ error: 'Gagal mengambil data layanan' });
  }
}
