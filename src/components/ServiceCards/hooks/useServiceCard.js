import { useEffect, useMemo, useState } from 'react';

// Metadata per layanan (logo, nama, slug, dsb)
const META_BY_ID = {
  1: { slug: 'bidrive',  desc: "Penugasan Kendaraan & Driver.",        logo: "/assets/D'MOVE.svg"  },
  2: { slug: 'bicare',  desc: "Antrian Poli & Konsultasi Dokter.",    logo: "/assets/D'CARE.svg"  },
  3: { slug: 'bimeal',  desc: "Permintaan Konsumsi.",                 logo: "/assets/D'MEAL.svg"  },
  4: { slug: 'bimeet',  desc: "Peminjaman Ruang Rapat.",              logo: "/assets/D'ROOM.svg"  },
  // 5: { slug: 'bimail',  desc: "Monitoring Penomoran & Pelacakan.",    logo: "/assets/D%27TRACK.svg" },
  6: { slug: 'bistay',  desc: "Reservasi Akomodasi Rumah Dinas.",     logo: "/assets/D'REST.svg"  },
};

export function useServiceCard(serviceId) {
  const meta = useMemo(() => META_BY_ID[serviceId] || null, [serviceId]);
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!meta) { setLoading(false); return; }
      try {
        setLoading(true);
        setErr('');

        // Ambil JUMLAH PENDING dari endpoint queue (hemat: perPage=1, baca "total")
        // Catatan: untuk layanan tanpa konsep pending (mis. BI.DOCS) endpoint bisa
        // mengembalikan total semua. Kalau ingin 0, tinggal set manual di bawah.
        let pending = 0;

        if (meta.slug === 'bimail') {
          // kalau BI.DOCS TIDAK ingin dihitung, jadikan 0
          pending = 0;
        } else {
          const res = await fetch(`/api/admin/queue/${meta.slug}?status=pending&page=1&perPage=1`, { cache: 'no-store' });
          const j = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(j?.error || 'Gagal memuat count');
          pending = Number(j?.total ?? 0);
        }

        if (alive) setData({ ...meta, pending });
      } catch (e) {
        if (alive) {
          setErr(e.message || 'Terjadi kesalahan');
          setData({ ...meta, pending: 0 });
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [meta]);

  return { data, err, loading };
}
