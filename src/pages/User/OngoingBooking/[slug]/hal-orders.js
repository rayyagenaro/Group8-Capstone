// src/pages/User/OngoingBooking/[slug]/hal-orders.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './hal-orders.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import BookingDetailModal from '@/components/BookingDetail/BookingDetailModal';
import RatingModal from '@/components/BookingDetail/RatingModal';
import { verifyAuth } from '@/lib/auth';
import { NS_RE } from '@/lib/ns-server';
import { withNs } from '@/lib/ns';

const norm = (s) => String(s || '').trim().toLowerCase();

function resolveFeatureKey(booking, slug) {
  const s = String(slug || '').toLowerCase();
  if (s.includes('bidrive')) return 'bidrive';
  if (s.includes('bimeal'))  return 'bimeal';
  if (s.includes('bimeet'))  return 'bimeet';
  if (s.includes('bimail'))  return 'bimail';
  if (s.includes('bistay'))  return 'bistay';
  if (s.includes('bicare'))  return 'bicare';

  if (booking?.feature_key) return booking.feature_key;
  const candidates = [
    booking?.service, booking?.service_name, booking?.service_code,
    booking?.feature, booking?.layanan, booking?.jenis_layanan, booking?.feature_name,
  ].map(norm).filter(Boolean);
  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, '');
    if (s.includes('bidrive')) return 'bidrive';
    if (s.includes('bimeal'))  return 'bimeal';
    if (s.includes('bimeet'))  return 'bimeet';
    if (s.includes('bimail'))  return 'bimail';
    if (s.includes('bistay'))  return 'bistay';
    if (s.includes('bicare'))  return 'bicare';
  }
  return 'unknown';
}

const calculateDays = (start, end) => {
  if (!start || !end) return '';
  const d = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${d || 1} Hari`;
};

const META = {
  bidrive: { title: "BI.DRIVE", logo: "/assets/D'MOVE.svg" },
  bicare:  { title: "BI.CARE",  logo: "/assets/D'CARE.svg" },
  bimeal:  { title: "BI.MEAL",  logo: "/assets/D'MEAL.svg" },
  bimeet:  { title: "BI.MEET",  logo: "/assets/D'ROOM.svg" },
  bimail:  { title: "BI.DOCS",  logo: "/assets/D'TRACK.svg" },
  bistay:  { title: "BI.STAY",  logo: "/assets/D'REST.svg" },
};

function renderCardText(slug, row) {
  const fmtID = (v) => (v ? new Date(v).toLocaleString('id-ID') : '-');

  switch (slug) {
    case 'bidrive':
      return {
        title: `Booking BI.DRIVE | ${row.tujuan || '-'}`,
        sub: calculateDays(row.start_date, row.end_date),
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    case 'bicare':
      return {
        title: `BI.CARE | ${row.booker_name || '-'}${row.patient_name ? ' → ' + row.patient_name : ''}`,
        sub: `${row.booking_date || '-'} • ${row.slot_time || '-'}`,
        status: row.status || '',
      };
    case 'bimeet':
      return {
        title: `BI.MEET | ${row.title || '-'}`,
        sub: `${row.start_datetime || '-'} → ${row.end_datetime || '-'}`,
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    case 'bimail':
      return {
        title: `BI.DOCS | ${row.nomor_surat || '-'}`,
        sub: `${row.tanggal_dokumen || '-'}${row.perihal ? ' • ' + row.perihal : ''}`,
        status: '',
      };
    case 'bistay':
      return {
        title: `BI.STAY | ${row.nama_pemesan || '-'}`,
        sub: `${row.check_in || '-'} → ${row.check_out || '-'}`,
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    case 'bimeal':
      return {
        title: `BI.MEAL | ${row.nama_pic || '-'}` + (row.unit_kerja ? ` • ${row.unit_kerja}` : ''),
        sub: fmtID(row.waktu_pesanan),
        status: row.status_name || (row.status_id === 1 ? 'Pending' : row.status_id ?? ''),
      };
    default:
      return { title: '', sub: '', status: '' };
  }
}

const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};

async function setDriversAvailable(driverIds, availableStatusId = 1) {
  if (!Array.isArray(driverIds) || driverIds.length === 0) return { ok: true, affected: 0 };
  const calls = driverIds.map((id) =>
    fetch('/api/updateDriversStatus', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: id, newStatusId: availableStatusId }),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `Gagal update driver ${id}`);
      }
      return true;
    })
  );
  const results = await Promise.allSettled(calls);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) throw new Error(failed[0].reason?.message || 'Gagal update sebagian driver');
  return { ok: true, affected: results.length };
}

async function setVehiclesAvailable(vehicleIds, availableStatusId = 1) {
  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0) return { ok: true, affected: 0 };
  const calls = vehicleIds.map((id) =>
    fetch('/api/updateVehiclesStatus', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: id, newStatusId: availableStatusId }),
    }).then(async (r) => {
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        throw new Error(e.error || `Gagal update vehicle ${id}`);
      }
      return true;
    })
  );
  const results = await Promise.allSettled(calls);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) throw new Error(failed[0].reason?.message || 'Gagal update sebagian kendaraan');
  return { ok: true, affected: results.length };
}

async function updateServiceStatus(featureKey, bookingId, newStatusId = 4, ns) {
  if (featureKey === 'bicare') return { ok: false, skipped: true };

  const idNum = numericIdOf(bookingId);
  if (!Number.isFinite(idNum)) throw new Error('ID booking tidak valid');

  const endpoint = {
    bidrive: '/api/booking',
    bimeet:  '/api/bimeet/createbooking',
    bimeal:  '/api/bimeal/book',
    bistay:  '/api/BIstaybook/bistaybooking',
  }[featureKey];

  if (!endpoint) throw new Error(`Finish tidak didukung untuk layanan ${featureKey}.`);

  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ bookingId: idNum, newStatusId, ...(ns ? { ns } : {}) }),
  });
  if (!res.ok) {
    let msg = `Gagal update status booking (${featureKey}).`;
    try {
      const err = await res.json();
      if (err?.error) msg = err.error;
      if (err?.message) msg += ` — ${err.message}`;
    } catch {}
    throw new Error(msg);
  }
  try { return await res.json(); } catch { return { ok: true }; }
}

export default function HalOrders({ initialUserName = 'User' }) {
  const router = useRouter();
  const slug = String(router.query.slug || '').toLowerCase();

  // ambil ns dari query/asPath
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = (router.asPath || '').split('?')[1];
    if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const [allBookings, setAllBookings] = useState([]);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('Semua');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [showFinish, setShowFinish] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // 🚧 Client-side guard: jika slug bimail/bidocs => pindah ke History
  useEffect(() => {
    if (slug === 'bimail' || slug === 'bidocs') {
      router.replace(withNs('/User/History/hal-history', ns));
    }
  }, [slug, ns, router]);

  // fetch pesanan (dengan early-return utk bimail/bidocs)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;

      // ⛔ Jangan tampilkan ongoing utk bimail/bidocs
      if (slug === 'bimail' || slug === 'bidocs') {
        if (!active) return;
        setItems([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true); setErr('');
        // Tentukan URL API secara dinamis berdasarkan slug
        let apiUrl = `/api/orders/${slug}?status=pending_or_approved&page=1&perPage=100`;
        if (slug === 'bimail') {
          // (tak terpakai karena early-return) — dibiarkan untuk kompatibilitas
          apiUrl = `/api/orders/${slug}?status=finished&page=1&perPage=100`;
        }
        const r = await fetch(apiUrl, { cache: 'no-store' });

        if (!r.ok) throw new Error('Gagal memuat pesanan');
        const d = await r.json();
        if (!active) return;
        setItems(d.items || []);
      } catch (e) {
        if (!active) return;
        setErr(e.message || 'Terjadi kesalahan');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [slug]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((items.length || 0) / itemsPerPage)),
    [items.length, itemsPerPage]
  );
  useEffect(() => { if (currentPage > totalPages) setCurrentPage(1); }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex   = startIndex + itemsPerPage;
  const pageItems  = useMemo(() => items.slice(startIndex, endIndex), [items, startIndex, endIndex]);

  const onPageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const meta = META[slug] || { title: slug.toUpperCase(), logo: '/assets/placeholder-service.svg' };

  const closeModal = useCallback(() => {
    setSelectedBooking(null);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'user', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-sign');
  };

  const buildDetailUrl = (row) => withNs(`/User/OngoingBooking/${slug}/detail?id=${row.id}`, ns);

  const handleCardClick = useCallback(async (booking) => {
    try {
      const featureKey = resolveFeatureKey(booking, slug);
      const bid = numericIdOf(booking.id);
      if (!Number.isFinite(bid)) throw new Error('ID booking tidak valid');

      let full;

      if (featureKey === 'bicare') {
        const apiUrl = `/api/BIcare/my-bookings`;
        const res = await fetch(apiUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`Gagal memuat daftar BI.CARE. Status: ${res.status}`);
        const responseData = await res.json();
        const allMyBookings = responseData.bookings;
        if (!Array.isArray(allMyBookings)) throw new Error('Respons API BI.CARE tidak valid.');
        const detailedBooking = allMyBookings.find(item => numericIdOf(item.id) === bid);
        if (!detailedBooking) throw new Error(`Booking BI.CARE dengan ID ${bid} tidak ditemukan.`);
        if (detailedBooking.status?.toLowerCase() === 'booked') detailedBooking.status_id = 2;
        full = { ...booking, ...detailedBooking, _raw_bicare: detailedBooking, feature_key: featureKey };

      } else if (featureKey === 'bidrive') {
        const apiUrl = `/api/bookings-with-vehicle?bookingId=${bid}`;
        const res = await fetch(apiUrl);
        if (!res.ok) throw new Error(`Gagal memuat detail BI.Drive. Status: ${res.status}`);
        full = await res.json();
        full.feature_key = 'bidrive';

      } else if (['bimeet', 'bimeal', 'bistay', 'bimail'].includes(featureKey)) {
        const apiEndpoints = {
          bimeet: `/api/bimeet/createbooking?bookingId=${bid}&ns=${ns}`,
          bimeal: `/api/bimeal/book?bookingId=${bid}&ns=${ns}`,
          bistay: `/api/BIstaybook/bistaybooking?bookingId=${bid}&ns=${ns}`,
          bimail: `/api/BImail?bookingId=${bid}&ns=${ns}`,
        };
        const apiUrl = apiEndpoints[featureKey];

        const res = await fetch(apiUrl, { credentials: 'include' });
        if (!res.ok) throw new Error(`Gagal memuat detail. Status: ${res.status}`);

        const responseData = await res.json();
        let itemData;

        let bookingsArray = [];
        if (Array.isArray(responseData)) {
          bookingsArray = responseData;
        } else if (responseData.data && Array.isArray(responseData.data)) {
          bookingsArray = responseData.data;
        } else if (responseData.items && Array.isArray(responseData.items)) {
          bookingsArray = responseData.items;
        } else {
          itemData = responseData.item || responseData;
        }

        if (!itemData) {
          itemData = bookingsArray.find(item => numericIdOf(item.id) === bid);
        }

        if (!itemData || Object.keys(itemData).length === 0) {
          throw new Error(`Data booking dengan ID ${bid} tidak ditemukan di response.`);
        }

        if (featureKey === 'bimail') {
          itemData.status_id = 4; // paksa finished
        }

        full = {
          ...booking,
          ...itemData,
          [`_raw_${featureKey}`]: itemData,
          feature_key: featureKey,
        };

      } else {
        full = booking;
      }

      setSelectedBooking(full);

    } catch (e) {
      console.error('Error di handleCardClick:', e.message);
      alert(`Gagal memuat detail: ${e.message}`);
    }
  }, [ns, slug]);

  const markAsFinished = useCallback(async (booking) => {
    const featureKey = resolveFeatureKey(booking);
    if (featureKey === 'bicare' || featureKey === 'bimail') {
      alert('Fitur ini tidak mendukung Finish dari UI.');
      return;
    }
    const bid = numericIdOf(booking.id);
    if (!Number.isFinite(bid)) {
      alert('ID booking tidak valid.');
      return;
    }
    try {
      setFinishing(true);
      if (featureKey === 'bidrive') {
        let fullBooking =
          selectedBooking && numericIdOf(selectedBooking.id) === bid ? selectedBooking : null;
        if (!fullBooking?.assigned_drivers || !fullBooking?.assigned_vehicles) {
          try {
            const r = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
            if (r.ok) fullBooking = await r.json();
          } catch {}
        }
        const driverIds = (fullBooking?.assigned_drivers || []).map(d => d.id);
        const vehicleIds = (fullBooking?.assigned_vehicles || []).map(v => v.id);
        await updateServiceStatus('bidrive', bid, 4, ns);
        await setDriversAvailable(driverIds, 1);
        await setVehiclesAvailable(vehicleIds, 1);
      } else {
        await updateServiceStatus(featureKey, bid, 4, ns);
      }

      setAllBookings(prev => prev.map(b => (numericIdOf(b.id) === bid ? { ...b, status_id: 4 } : b)));

      if (featureKey === 'bidrive') {
        try {
          const r2 = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
          const full = await r2.json().catch(() => null);
          setSelectedBooking(full ? { ...full, feature_key: 'bidrive' } : { ...booking, status_id: 4 });

          // jika ada flow feedback, lanjutkan sesuai implementasi kamu
          // setSelectedFeedback(...); setRatingOpen(true) bila perlu
        } catch {
          setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
          setRatingOpen(true);
        }
      } else {
        setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
      }

      setActiveTab('Finished');
    } catch (e) {
      alert(e.message);
    } finally {
      setFinishing(false);
    }
  }, [selectedBooking, ns]);

  const submitRating = async (payload) => {
    try {
      setRatingSubmitting(true);
      const res = await fetch(withNs('/api/bidrive/feedback', ns), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        let msg = 'Gagal mengirim penilaian.';
        try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
        throw new Error(msg);
      }
      // selesai rating -> pindah ke History
      router.push(`/User/History/hal-history?ns=${ns}`);
    } catch (e) {
      alert(e.message || 'Gagal mengirim penilaian.');
      setRatingSubmitting(false);
    }
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.greeting}>
          Pesanan Berlangsung
        </div>

        <div className={styles.boxLayanan}>
          <div className={styles.headerRow}>
            <button type="button" className={styles.backBtn} onClick={() => router.back()}>
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Kembali
            </button>
            <div className={styles.titleLayanan}>PESANAN SAYA • {meta.title}</div>
            <div aria-hidden="true" />
          </div>

          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {loading ? (
              <p className={styles.loadingText}>Memuat pesanan...</p>
            ) : err ? (
              <p className={styles.errorText}>Error: {err}</p>
            ) : pageItems.length === 0 ? (
              <p className={styles.emptyText}>Belum ada pesanan.</p>
            ) : (
              pageItems.map((row) => {
                const t = renderCardText(slug, row);
                const to = buildDetailUrl(row);
                return (
                  <div
                    key={row.id}
                    className={styles.cardLayanan}
                    onClick={() => handleCardClick(row)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(to)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Lihat detail pesanan ${meta.title} #${row.id}`}
                  >
                    <Image
                      src={meta.logo}
                      alt={meta.title}
                      width={70}
                      height={70}
                      className={styles.cardLogo}
                      priority
                    />
                    <div className={styles.cardContent}>
                      <div className={styles.layananTitle}>{t.title}</div>
                      {t.sub && <div className={styles.layananSub}>{t.sub}</div>}
                      {t.status && (
                        <div className={`${styles.layananStatus} 
                        ${t.status === 'Pending' ? styles.layananStatusProcess : ''}
                        ${t.status === 'Approved' ? styles.layananStatusApproved : ''}
                        ${t.status === 'Booked' ? styles.layananStatusApproved : ''}
                        `}>
                          {t.status}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && !err && items.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {items.length ? startIndex + 1 : 0}-{Math.min(endIndex, items.length)} dari {items.length} data
                </div>
                <div>
                  <label htmlFor="perPage" className={styles.label}>Jumlah item per halaman</label>
                  <select id="perPage" className={styles.itemsPerPageDropdown} value={itemsPerPage} onChange={onChangeItemsPerPage}>
                    <option value={5}>5</option>
                    <option value={6}>6</option>
                    <option value={8}>8</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                  </select>
                </div>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </div>
      </main>

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
      <BookingDetailModal
        booking={selectedBooking}
        feedback={selectedFeedback}
        onClose={closeModal}
        onFinish={markAsFinished}
        finishing={finishing}
        onOpenRating={() => setRatingOpen(true)}
      />
      <RatingModal
        open={ratingOpen && !!selectedBooking}
        onClose={() => setRatingOpen(false)}
        onSubmit={submitRating}
        booking={selectedBooking}
        submitting={ratingSubmitting}
      />
    </div>
  );
}

/* ========= SSR guard (hanya role user / role_id=3) + blokir bimail/bidocs ========= */
export async function getServerSideProps(ctx) {
  const { slug: rawSlug } = ctx.params || {};
  const slug = String(rawSlug || '').toLowerCase();

  // ⛔ blokir ongoing untuk bimail/bidocs -> redirect ke History
  if (slug === 'bimail' || slug === 'bidocs') {
    const { ns: rawNs } = ctx.query;
    const ns = Array.isArray(rawNs) ? rawNs[0] : rawNs;
    const nsQuery = typeof ns === 'string' && NS_RE.test(ns) ? `?ns=${encodeURIComponent(ns)}` : '';
    return {
      redirect: {
        destination: `/User/History/hal-history${nsQuery}`,
        permanent: false,
      },
    };
  }

  const { ns: raw } = ctx.query;
  const ns = Array.isArray(raw) ? raw[0] : raw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;
  const from = ctx.resolvedUrl || '/User/OngoingBooking/[slug]/hal-orders';

  if (!nsValid) {
    return {
      redirect: {
        destination: `/Signin/hal-sign?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const result = await verifyAuth(ctx.req, ['user'], 'user');

  if (!result.ok) {
    return {
      redirect: {
        destination: `/Signin/hal-sign?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  return {
    props: {
      initialUserName: result.payload?.name || 'User',
      userId: result.userId,
      role: result.role,
      ns: result.ns,
    },
  };
}
