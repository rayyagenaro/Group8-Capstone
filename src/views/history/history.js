import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './history.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import RejectionBox from '@/components/RejectionBox/RejectionBox';
import { FaArrowLeft, FaStar } from 'react-icons/fa';
import BookingDetailModal from '@/components/BookingDetail/BookingDetailModal';
import RatingModal from '@/components/BookingDetail/RatingModal';
import { getNs } from '@/lib/ns';
import { fetchAllBookings } from '@/lib/fetchBookings';


/* ====== Status & Feature helpers ====== */
const safeParse = (v) => {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v || '[]'); } catch { return []; }
};
async function fetchFeedbackByBookingId(bid) {
  const r = await fetch(`/api/bidrive/feedback?bookingId=${bid}`, { credentials: 'include' });

  if (r.status === 404) return null;           // kalau kamu nanti ganti 404
  if (!r.ok) return null;                      // gagal → anggap belum ada

  const data = await r.json().catch(() => null);
  const item = data?.item || null;
  const rating = Number(item?.rating_overall || 0);
  if (rating < 1 || rating > 5) return null;   // ⬅️ kunci utama

  const tags = Array.isArray(item?.tags) ? item.tags : safeParse(item?.tags_json);
  return { ...item, rating_overall: rating, tags };
}

const withNs = (url, ns) =>
  ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url;

const STATUS_CONFIG = {
  '3': { text: 'Rejected', className: styles.statusRejected },
  '4': { text: 'Finished', className: styles.statusFinished },
  '5': { text: 'Cancelled', className: styles.statusCancelled },
};
const TABS = ['Semua', 'Rejected', 'Finished', 'Cancelled'];
const TAB_TO_STATUS_ID = { Rejected: 3, Finished: 4, Cancelled: 5 };
const SEEN_KEYS = { Rejected: 'rejected', Finished: 'finished', Cancelled: 'cancelled' };
const DEFAULT_SEEN = { rejected: 0, finished: 0, cancelled: 0 };
const seenStorageKey = (userId) => `statusTabSeen:${userId}`;

const FEATURE_OPTIONS = [
  { label: 'Semua', value: 'semua' },
  { label: 'Drive', value: 'bidrive' },
  { label: 'Care',  value: 'bicare' },
  { label: 'Meal',  value: 'bimeal' },
  { label: 'Meet',  value: 'bimeet' },
  { label: 'Stay',  value: 'bistay' },
];
const FEATURE_LOGOS = {
  bidrive: "/assets/D'MOVE.svg",
  bicare:  "/assets/D'CARE.svg",
  bimeal:  "/assets/D'MEAL.svg",
  bimeet:  "/assets/D'ROOM.svg",
  bimail:  "/assets/D'TRACK.svg",
  bistay:  "/assets/D'REST.svg",
};
const norm = (s) => String(s || '').trim().toLowerCase();
function resolveFeatureKey(booking) {
  if (booking?.feature_key) return booking.feature_key;
  const candidates = [
    booking?.service, booking?.service_name, booking?.service_code,
    booking?.feature, booking?.layanan, booking?.jenis_layanan, booking?.feature_name,
  ].map(norm).filter(Boolean);
  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, '');
    if (s.includes('bidrive') || s.includes('bi.drive') || s === 'drive') return 'bidrive';
    if (s.includes('bimeal')  || s.includes('bi.meal')  || s === 'meal')  return 'bimeal';
    if (s.includes('bimeet')  || s.includes('bi.meet')  || s === 'meet')  return 'bimeet';
    if (s.includes('bimail')  || s.includes('bi.docs')  || s === 'docs')  return 'bimail';
    if (s.includes('bistay')  || s.includes('bi.stay')  || s === 'stay')  return 'bistay';
    if (s.includes('bicare')  || s.includes('bi.care')  || s === 'care')  return 'bicare';
  }
  return 'unknown';
}
function featureLabelOf(booking) {
  switch (resolveFeatureKey(booking)) {
    case 'bidrive': return 'BI.Drive';
    case 'bicare':  return 'BI.Care';
    case 'bimeal':  return 'BI.Meal';
    case 'bimeet':  return 'BI.Meet';
    case 'bimail':  return 'BI.Docs';
    case 'bistay':  return 'BI.Stay';
    default:        return null;
  }
}
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return String(dateString);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};
const logoSrcOf = (booking) => FEATURE_LOGOS[resolveFeatureKey(booking)] || '/assets/BI-One-Blue.png';

/* ===== Optional helpers: set available & update status ===== */
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

/* ====== Halaman ====== */
export default function History() {
  const router = useRouter();
  const ns = getNs(router);

  const [userId, setUserId] = useState(null);
  const [allBookings, setAllBookings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Semua');
  const [featureValue, setFeatureValue] = useState('semua');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const autoFinishTried = useRef(new Set());
  const [seenCounts, setSeenCounts] = useState(DEFAULT_SEEN);

  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);
  const bookingsToShow = useMemo(() => {
  const allowedStatusIds = [3, 4, 5];
    return allBookings.filter(b => allowedStatusIds.includes(Number(b.status_id)));
  }, [allBookings]);
  const [feedbackById, setFeedbackById] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      setIsLoading(true);
      try {
        const meRes = await fetch('/api/me?scope=user', { cache: 'no-store', credentials:'include' });
        const meData = await meRes.json();
        if (!active) return;
        if (!meData.hasToken || meData.payload?.role !== 'user') {
          setError('Silakan login untuk melihat history.');
          setIsLoading(false);
          return;
        }
        const uid = Number(meData.payload.sub);
        setUserId(uid);
        try {
          const raw = localStorage.getItem(seenStorageKey(uid));
          setSeenCounts(raw ? { ...DEFAULT_SEEN, ...JSON.parse(raw) } : DEFAULT_SEEN);
        } catch { setSeenCounts(DEFAULT_SEEN); }

        const bookings = await fetchAllBookings(ns, 'user');
        if (active) setAllBookings(bookings);
      } catch (e) {
        setError(e.message);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => { active = false; };
  }, [ns]);

  /* Auto-finish BI.Care */
  useEffect(() => {
    if (!allBookings.length) return;
    let cancelled = false;
    const runCheck = async () => {
      const now = Date.now();
      for (const b of allBookings) {
        if (resolveFeatureKey(b) !== 'bicare') continue;
        if (Number(b.status_id) !== 2) continue;
        const endMs = new Date(b.end_date).getTime();
        if (!Number.isFinite(endMs)) continue;
        if (now > endMs && !autoFinishTried.current.has(b.id)) {
          autoFinishTried.current.add(b.id);
          try {
            await updateServiceStatus('bicare', numericIdOf(b.id), 4, ns);
            if (cancelled) return;
            setAllBookings(prev => prev.map(x => (x.id === b.id ? { ...x, status_id: 4 } : x)));
            setSelectedBooking(prev => prev && prev.id === b.id ? { ...prev, status_id: 4 } : prev);
          } catch (e) {
            autoFinishTried.current.delete(b.id);
            
          }
        }
      }
    };
    runCheck();
    const timer = setInterval(runCheck, 60_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [allBookings, ns]);

  useEffect(() => {
    document.body.style.overflow = selectedBooking ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [selectedBooking]);

  const handleLogout = async () => {
    try { await fetch('/api/logout', { method: 'POST' }); } catch {}
    finally { router.replace('/Signin/hal-sign'); }
  };

  const renderMiniStar = (i, filled) => (
    <FaStar key={i} className={filled ? styles.starMiniFilled : styles.starMiniEmpty} />
  );

  /* Card list */
  const BookingCard = React.memo(({ booking, onClick, driveRating }) => {
    const statusInfo = STATUS_CONFIG[booking.status_id] || { text: 'Unknown', className: styles.statusProcess };
    const isRejected = Number(booking.status_id) === 3 && !!booking.rejection_reason;
    const isCancelled = Number(booking.status_id) === 5 && !!booking.rejection_reason;
    const featureLabel = featureLabelOf(booking);
    const featureKey = resolveFeatureKey(booking);
    const isBidriveFinished = featureKey === 'bidrive' && Number(booking.status_id) === 4;
    const ratingValue = Number(driveRating?.rating_overall || 0);

    const renderServiceLine = () => {
      switch (featureKey) {
        case 'bicare': {
          const jam = booking._raw_bicare?.slot_time?.slice(0,5);
          const pasien = booking._raw_bicare?.patient_name;
          return (
            <div className={styles.cardVehicles}>
              {jam ? `Jam: ${jam}` : ''}{jam && pasien ? ' • ' : ''}{pasien ? `Pasien: ${pasien}` : ''}
            </div>
          );
        }
        case 'bimail': {
          const nomor = booking.nomor_surat;
          const perihal = booking.perihal;
          const route = (booking.dari && booking.kepada) ? `Dari: ${booking.dari} → ${booking.kepada}` : '';
          const parts = [nomor && `Nomor: ${nomor}`, perihal && `Perihal: ${perihal}`, route].filter(Boolean);
          return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
        }
        case 'bimeal': {
          const unit   = booking.unit_kerja || booking._raw_bimeal?.unit_kerja;
          const count  = booking.items?.length || booking._raw_bimeal?.items?.length || 0;
          const total  = (booking.items || booking._raw_bimeal?.items || [])
                          .reduce((sum, it) => sum + (it.qty || 0), 0) || 0;
          const ket    = booking.keterangan || booking._raw_bimeal?.keterangan;
          const lokasi = booking.lokasi_pengiriman || booking._raw_bimeal?.lokasi_pengiriman;
          const parts = [
            unit && `Unit: ${unit}`,
            count ? `Item: ${count}` : null,
            total ? `Total qty: ${total}` : null,
            ket && `Keterangan: ${ket}`,
            lokasi && `Lokasi Antar: ${lokasi}`,
          ].filter(Boolean);
          return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
        }
        case 'bimeet': {
          const rn = booking.room_name;
          const part = booking.participants;
          const uker = booking.unit_kerja;
          const parts = [rn && `Ruangan: ${rn}`, Number.isFinite(part) && `Peserta: ${part}`, uker && `Unit: ${uker}`]
            .filter(Boolean);
          return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
        }
        case 'bistay': {
          const s = booking._raw_bistay;
          const parts = [
            s?.nama_pemesan && `Pemesan: ${s.nama_pemesan}`,
            s?.asal_kpw && `Asal KPW: ${s.asal_kpw}`,
            s?.status_pegawai && `Status: ${s.status_pegawai}`,
          ].filter(Boolean);
          return parts.length ? <div className={styles.cardVehicles}>{parts.join(' • ')}</div> : null;
        }
        default: {
          if (featureKey === 'bidrive' && booking.vehicle_types?.length > 0) {
            return <div className={styles.cardVehicles}>{booking.vehicle_types.map((vt) => vt.name).join(', ')}</div>;
          }
          return null;
        }
      }
    };

    return (
      <div
        className={styles.bookingCard}
        onClick={onClick}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        role="button"
        tabIndex={0}
      >
        <Image src={logoSrcOf(booking)} alt={featureLabel || 'logo'} width={70} height={70} className={styles.cardLogo} />

        {/* Kiri: detail default */}
        <div className={styles.cardDetail}>
          <div className={styles.cardTitle}>
            {featureLabel ? `[${featureLabel}] ` : ''}Booking | {booking.tujuan || 'Tanpa Tujuan'}
          </div>

          <div className={styles.cardSub}>
            {`${formatDate(booking.start_date)} - ${formatDate(booking.end_date)}`}
          </div>

          {renderServiceLine()}
          <div className={statusInfo.className}>{statusInfo.text}</div>

          {isRejected && (
            <div style={{ marginTop: 8 }}>
              <RejectionBox reason={booking.rejection_reason} compact />
            </div>
          )}
          {isCancelled && (
            <div style={{ marginTop: 8 }}>
              <RejectionBox reason={booking.rejection_reason} compact />
            </div>
          )}
        </div>

        {/* Kanan: status rating khusus BI.Drive Finished */}
        {isBidriveFinished && (
          <div className={styles.cardRight} onClick={(e) => e.stopPropagation()}>
            {driveRating === undefined ? null : (
              ratingValue < 1 ? (
                <div className={styles.unratedText}>Belum Anda Rating</div>
              ) : (
                <div className={styles.ratedBox}>
                  <div className={styles.ratingLabel}>Rating Anda</div>

                  <div className={styles.starsTight} role="img" aria-label={`Rating ${ratingValue} dari 5`}>
                    {/* baris atas: 2 bintang */}
                    <div className={styles.triRowTop}>
                      <FaStar className={ratingValue >= 1 ? styles.starMiniFilled : styles.starMiniEmpty} />
                      <FaStar className={ratingValue >= 2 ? styles.starMiniFilled : styles.starMiniEmpty} />
                    </div>

                    {/* baris bawah: 3 bintang */}
                    <div className={styles.triRowBottom}>
                      <FaStar className={ratingValue >= 3 ? styles.starMiniFilled : styles.starMiniEmpty} />
                      <FaStar className={ratingValue >= 4 ? styles.starMiniFilled : styles.starMiniEmpty} />
                      <FaStar className={ratingValue >= 5 ? styles.starMiniFilled : styles.starMiniEmpty} />
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    );
  });
  BookingCard.displayName = 'BookingCard';

  /* Buka detail */
  const handleCardClick = useCallback(async (booking) => {
    try {
      const featureKey = resolveFeatureKey(booking);
      const bid = numericIdOf(booking.id);
      if (!Number.isFinite(bid)) throw new Error('ID booking tidak valid');

      let full = booking;

      if (featureKey === 'bidrive') {
        const res = await fetch(`/api/bookings-with-vehicle?bookingId=${bid}`);
        if (!res.ok) throw new Error('Gagal memuat detail booking.');
        full = await res.json();
        full.feature_key = 'bidrive';

        if (Number(full.status_id) === 4) {
          const frItem = await fetchFeedbackByBookingId(bid); // ✅ pakai helper
          setSelectedFeedback(frItem);
          if (!frItem) setRatingOpen(true);                   // selesai tapi blm ada feedback -> buka modal
        } else {
          setSelectedFeedback(null);
        }

      } else if (featureKey === 'bimeet') {
        const res = await fetch(`/api/bimeet/createbooking?bookingId=${bid}&ns=${ns}`, { credentials: 'include' });
        if (!res.ok) throw new Error('Gagal memuat detail BI.Meet.');
        const fullRes = await res.json();
        if (!fullRes.item) throw new Error('Data booking tidak ditemukan.');
        full = { ...fullRes.item, feature_key: 'bimeet' };
      }

      setSelectedBooking(full);
    } catch (e) {
    }
  }, [ns]);

  const closeModal = useCallback(() => {
    setSelectedBooking(null);
    setSelectedFeedback(null);
    setRatingOpen(false);
  }, []);

  /* Filter Tabs, Pagination */
  const tabCounts = useMemo(() => {
    const c = { rejected: 0, finished: 0, cancelled: 0 };
    for (const b of allBookings) {
      if (b.status_id === 3) c.rejected++;
      else if (b.status_id === 4) c.finished++;
      else if (b.status_id === 5) c.cancelled++;
    }
    return c;
  }, [allBookings]);

  const badgeCounts = useMemo(() => ({
    rejected: Math.max(0, tabCounts.rejected - (seenCounts.rejected || 0)),
    finished: Math.max(0, tabCounts.finished - (seenCounts.finished || 0)),
    cancelled: Math.max(0, tabCounts.cancelled - (seenCounts.cancelled || 0)),
  }), [tabCounts, seenCounts]);

  const markTabSeen = useCallback((tabName) => {
    if (!userId || tabName === 'Semua') return;
    const key = SEEN_KEYS[tabName];
    const next = { ...seenCounts, [key]: tabCounts[key] };
    setSeenCounts(next);
    try { localStorage.setItem(seenStorageKey(userId), JSON.stringify(next)); } catch {}
  }, [seenCounts, tabCounts, userId]);

  const handleTabChange = useCallback((tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
    markTabSeen(tabName);
  }, [markTabSeen]);

  const handleFeatureChange = useCallback((value) => {
    setFeatureValue(value);
    setCurrentPage(1);
  }, []);

  const statusFiltered = useMemo(() => {
    if (activeTab === 'Semua') return bookingsToShow;
    const statusId = TAB_TO_STATUS_ID[activeTab];
    return bookingsToShow.filter((item) => Number(item.status_id) === statusId); 
  }, [activeTab, bookingsToShow]);

  const filteredBookings = useMemo(() => {
    if (featureValue === 'semua') return statusFiltered;
    return statusFiltered.filter((b) => resolveFeatureKey(b) === featureValue);
  }, [statusFiltered, featureValue]);

  const totalPages = useMemo(() => {
    if (!filteredBookings.length) return 1;
    return Math.ceil(filteredBookings.length / itemsPerPage);
  }, [filteredBookings.length, itemsPerPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedBookings = useMemo(
    () => filteredBookings.slice(startIndex, endIndex),
    [filteredBookings, startIndex, endIndex]
  );

  useEffect(() => {
    const need = [];
    for (const b of paginatedBookings) {
      if (resolveFeatureKey(b) === 'bidrive' && Number(b.status_id) === 4) {
        const bid = numericIdOf(b.id);
        if (feedbackById[bid] === undefined) need.push(bid);
      }
    }
    if (!need.length) return;

    need.forEach(async (bid) => {
      try {
        const fi = await fetchFeedbackByBookingId(bid); // null jika belum dirating
        setFeedbackById(prev => ({ ...prev, [bid]: fi }));
      } catch {
        setFeedbackById(prev => ({ ...prev, [bid]: null }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginatedBookings]);

  const onPageChange = useCallback((page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }, [totalPages]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setItemsPerPage(val);
    setCurrentPage(1);
  };

  const resultsFrom = filteredBookings.length ? startIndex + 1 : 0;
  const resultsTo = Math.min(endIndex, filteredBookings.length);

  const FeatureDropdown = React.memo(({ value, onChange }) => (
    <div className={styles.filterRow}>
      <label htmlFor="featureFilter" className={styles.label}>Fitur/Layanan:</label>
      <select id="featureFilter" className={styles.itemsPerPageDropdown} value={value} onChange={(e) => onChange(e.target.value)}>
        {FEATURE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
      </select>
    </div>
  ));
  FeatureDropdown.displayName = 'FeatureDropdown';

  const TabFilter = React.memo(({ currentTab, onTabChange, badgeCounts }) => (
    <div className={styles.tabRow}>
      {TABS.map((tabName) => {
        const isAll = tabName === 'Semua';
        const key = SEEN_KEYS[tabName];
        const count = isAll ? 0 : (badgeCounts[key] || 0);
        const showNumber = !isAll && count > 0;

        // KODE BARU
        return (
          <button key={tabName} className={`${styles.tabBtn} ${currentTab === tabName ? styles.tabActive : ''}`} onClick={() => onTabChange(tabName)} type="button">
            <span className={styles.tabLabel}>{tabName}</span>
            
            {/* Tampilkan badge HANYA jika showNumber bernilai true */}
            {showNumber && (
              <span className={`${styles.tabBadge} ${styles.tabBadgeActive}`}>{count}</span>
            )}
          </button>
        );
      })}
    </div>
  ));
  TabFilter.displayName = 'TabFilter';

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

          const frItem = await fetchFeedbackByBookingId(bid); // ✅ pakai helper
            setSelectedFeedback(frItem);
            if (!frItem) setRatingOpen(true);

        } catch {
          setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
          setRatingOpen(true);
        }
      } else {
        setSelectedBooking(prev => (prev ? { ...prev, status_id: 4 } : prev));
      }

      setActiveTab('Finished');
      markTabSeen('Finished');
    } catch (e) {
      alert(e.message);
    } finally {
      setFinishing(false);
    }
  }, [selectedBooking, ns, markTabSeen]);

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
      setSelectedFeedback({
        rating_overall: payload.rating_overall,
        tags: payload.tags || [],
        comment_text: payload.comment_text || '',
      });
      setRatingOpen(false);
    } catch (e) {
      alert(e.message || 'Gagal mengirim penilaian.');
    } finally {
      setRatingSubmitting(false);
    }
  };

  /* Render */
  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.bookingBox}>
          <div className={styles.topRowPage}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> 
            </button>
            <div className={styles.title}>History Booking</div>
          </div>

          <FeatureDropdown value={featureValue} onChange={handleFeatureChange} />
          <TabFilter currentTab={activeTab} onTabChange={handleTabChange} badgeCounts={badgeCounts} />

          <div className={styles.listArea}>
            {isLoading && <div className={styles.emptyState}>Memuat booking...</div>}
            {error && <div className={styles.emptyState} style={{ color: 'red' }}>{error}</div>}
            {!isLoading && !error && paginatedBookings.length === 0 && (
              <div className={styles.emptyState}>Tidak ada booking dengan filter ini.</div>
            )}
            {!isLoading && !error && paginatedBookings.map((item) => (
              <BookingCard
                key={item.id}
                booking={item}
                onClick={() => handleCardClick(item)}
                driveRating={feedbackById[numericIdOf(item.id)]}   // ⬅️ tambahan
              />
            ))}
          </div>

          {!isLoading && !error && filteredBookings.length > 0 && (
            <div className={styles.paginationContainer}>
              <div className={styles.paginationControls}>
                <div className={styles.resultsText}>
                  Menampilkan {resultsFrom}-{resultsTo} dari {filteredBookings.length} data
                </div>
                <div>
                  <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                  <select id="perPage" className={styles.itemsPerPageDropdown} value={itemsPerPage} onChange={onChangeItemsPerPage}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={15}>15</option>
                    <option value={20}>20</option>
                  </select>
                </div>
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange} />
            </div>
          )}
        </div>
      </main>

      <BookingDetailModal
        booking={selectedBooking}
        feedback={selectedFeedback}             
        onClose={closeModal}
        onFinish={markAsFinished}
        finishing={finishing}
        onOpenRating={() => setRatingOpen(true)} // << hanya dipakai saat BI.Drive Finished & belum ada feedback
      />

      <RatingModal
        open={ratingOpen && !!selectedBooking}
        onClose={() => setRatingOpen(false)}
        onSubmit={submitRating}
        booking={selectedBooking}
        submitting={ratingSubmitting}
      />

      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
