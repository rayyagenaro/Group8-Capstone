// src/views/detailslaporan/detailsLaporan.js
import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import styles from './detailsLaporan.module.css';
import { FaArrowLeft } from 'react-icons/fa';
import { jwtVerify } from 'jose';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import PersetujuanPopup from '@/components/persetujuanpopup/persetujuanPopup';
import RejectReasonPopup from '@/components/RejectReasonPopup/RejectReasonPopup';
import RejectVerificationPopup from '@/components/rejectVerification/RejectVerification';
import CancelVerificationPopup from '@/components/cancelVerification/CancelVerificationPopup';
import KontakDriverPopup from '@/components/KontakDriverPopup/KontakDriverPopup';
import PopupAdmin from '@/components/PopupAdmin/PopupAdmin';

// SECTION COMPONENTS (per modul)
import BiDriveSection from '@/components/DetailsLaporan/bidrive/BiDriveSection';
import BiCareSection  from '@/components/DetailsLaporan/bicare/BiCareSection';
import BiMeetSection  from '@/components/DetailsLaporan/bimeet/BiMeetSection';
import BiStaySection  from '@/components/DetailsLaporan/bistay/BiStaySection';
import BiMailSection  from '@/components/DetailsLaporan/bidocs/BiDocsSection';
import BiMealSection  from '@/components/DetailsLaporan/bimeal/BiMealSection';

// Helpers
import { getNsFromReq, NS_RE } from '@/lib/ns-server';
import { withNs } from '@/lib/ns';
import { verifyAuth } from '@/lib/auth';


/* ===== Helpers (formatting) ===== */
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return String(dateString);
  return d.toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const formatDateOnly = (d) => {
  if (!d) return '-';
  const x = new Date(d);
  if (Number.isNaN(x.valueOf())) return String(d);
  return x.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};
const formatDuration = (start, end) => {
  if (!start || !end) return '-';
  const diff = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${diff || 1} Hari | ${formatDateOnly(start)} - ${formatDateOnly(end)}`;
};
const toWaNumber = (val) => {
  if (!val) return '';
  let p = String(val).trim().replace(/[^\d]/g, '');
  if (!p) return '';
  if (p.startsWith('62')) return p.replace(/^620+/, '62');
  if (p.startsWith('0'))  return '62' + p.slice(1);
  if (p.startsWith('8'))  return '62' + p;
  return p;
};
const getStatusId = (slug, booking, detail) => (slug === 'bidrive') ? booking?.status_id : detail?.status_id;

/* ===== Status styles ===== */
const STATUS_CONFIG = {
  '1': { text: 'Pending',   className: styles.statusPending,  dot: styles.dotPending  },
  '2': { text: 'Approved',  className: styles.statusApproved, dot: styles.dotApproved },
  '3': { text: 'Rejected',  className: styles.statusRejected, dot: styles.dotRejected },
  '4': { text: 'Finished',  className: styles.statusFinished, dot: styles.dotFinished },
  '5': { text: 'Cancelled',  className: styles.statusCancelled, dot: styles.dotCancelled },
};

const statusPegawaiData = [
  { id: 1, status: 'Pegawai' },
  { id: 2, status: 'Pensiun' },
];

/* ===== Meta judul ===== */
const META = {
  bidrive: { title: 'BI-DRIVE' },
  bicare:  { title: 'BI-CARE'  },
  bimeet:  { title: 'BI-MEET'  },
  bimail:  { title: 'BI-DOCS'  },
  bistay:  { title: 'BI-STAY'  },
  bimeal:  { title: 'BI-MEAL'  },
};

/* ===== Util ===== */
const ALLOWED_SLUGS = ['bidrive', 'bicare', 'bimeet', 'bimail', 'bistay', 'bimeal', 'dmove'];
const getPlate = (v) => v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? '-');

function mapStatus(detail, slug) {
  if (!detail) return null;
  let id = detail.status_id;
  const s = (detail.status || detail.status_name || '').toString().toLowerCase();
  if (!id) {
    if (s.includes('pend')) id = 1;
    else if (s.includes('appr') || s.includes('book')) id = 2;
    else if (s.includes('reject') || s.includes('decline') || s.includes('cancel')) id = 3;
    else if (s.includes('finish') || s.includes('done') || s.includes('selesai')) id = 4;
  }
  if (slug === 'bicare') {
    if (id === 2) return { text: 'Booked', className: styles.statusApproved, dot: styles.dotApproved };
    if (id === 4) return { text: 'Finished', className: styles.statusFinished, dot: styles.dotFinished };
    return { text: detail?.status || '-', className: styles.statusPending, dot: styles.dotPending };
  }
  const info = STATUS_CONFIG[String(id || '1')];
  return info || null;
}

const isPendingGeneric = (slug, d) => {
  if (!d) return false;
  const s = String(slug || '').toLowerCase();
  const numish = (v) => { const n = Number(v); return Number.isNaN(n) ? null : n; };
  const byText = () => {
    const txt = [d.status, d.status_name, d.approval_status, d.booking_status, d.state]
      .map((v) => String(v ?? '').toLowerCase())
      .find((t) => t);
    return !!(txt && (txt.includes('pend') || txt.includes('menunggu') || txt.includes('await') || txt.includes('diajukan') || txt.includes('submit')));
  };
  if (s === 'bicare') {
    return false;
  }
  if (s === 'bimeal') { const n = numish(d.status_id); return n === 1 || n === 0; }
  if (s === 'bimeet') { if (d.status_id == null) return true; const n = numish(d.status_id); return n === 1 || n === 0; }
  if (s === 'bistay') { const n = numish(d.status_id ?? d.booking_status_id ?? d.state); if (n != null) return n === 1 || n === 0; return byText(); }
  const n = numish(d.status_id ?? d.booking_status_id ?? d.state);
  if (n != null) return n === 1 || n === 0;
  return byText();
};

/* ===== Penerima WA per fitur ===== */
const pickPersonForWA = (slug, booking, detail) => {
  switch (slug) {
    case 'bidrive': return { name: booking?.user_name,  phone: booking?.phone };
    case 'bicare':  return { name: detail?.booker_name || detail?.patient_name, phone: detail?.wa };
    case 'bimeet':  return { name: detail?.pic_name,    phone: detail?.contact_phone };
    case 'bistay':  return { name: detail?.nama_pemesan, phone: detail?.no_wa };
    case 'bimeal':  return { name: detail?.nama_pic,     phone: detail?.no_wa_pic };
    default:        return { name: '', phone: '' };
  }
};

/* ===== Builder pesan WA default ===== */
const buildRejectPreview = (slug, person, reason) => {
  const service = META[slug]?.title || slug.toUpperCase();
  return `Halo ${person?.name || ''},

Pengajuan ${service} Anda *DITOLAK* ❌

Alasan:
${reason}

Silakan lakukan perbaikan/pengajuan ulang. Terima kasih.`;
};

const buildCancelPreview = (slug, person, reason) => {
  const service = META[slug]?.title || slug.toUpperCase();
  return `Halo ${person?.name || ''},

Booking ${service} Anda *DIBATALKAN* ❌

Alasan:
${reason}

Terima kasih.`;
};

/* ===== Helper numeric id + set available ===== */
const numericIdOf = (id) => {
  const m = String(id ?? '').match(/(\d+)$/);
  return m ? Number(m[1]) : NaN;
};
async function setDriversAvailable(driverIds, availableStatusId = 1) {
  if (!Array.isArray(driverIds) || driverIds.length === 0) return { ok: true, affected: 0 };
  const calls = driverIds.map((id) =>
    fetch('/api/updateDriversStatus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId: id, newStatusId: availableStatusId }),
      keepalive: true,
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
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicleId: id, newStatusId: availableStatusId }),
      keepalive: true,
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

/* ============================== COMPONENT ============================== */
export default function DetailsLaporanView({ initialRoleId = null }) {
  const router = useRouter();
  const { id, slug: qslug } = router.query || {};

  // ns
  const nsFromQuery = typeof router.query?.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = (router.asPath || '').split('?')[1];
    if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // slug (aliaskan 'dmove' -> 'bidrive' untuk tampilan; API tetap pakai 'dmove')
  const raw = (typeof qslug === 'string' ? qslug : '').toLowerCase();
  const normalized = raw === 'dmove' ? 'bidrive' : raw;
  const slug = ALLOWED_SLUGS.includes(normalized) ? (normalized === 'dmove' ? 'bidrive' : normalized) : 'bidrive';
  const apiSlug = slug 

  // ==== pilih sidebar by role (SSR → client fallback) ====
  const [roleId, setRoleId] = useState(initialRoleId);
  const [sbLoading, setSbLoading] = useState(initialRoleId == null);
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      const nsParam = new URLSearchParams(location.search).get('ns') || '';
      try {
        const url = nsParam ? `/api/me?scope=admin&ns=${encodeURIComponent(nsParam)}` : `/api/me?scope=admin`;
        const r = await fetch(url, { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;
        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);
        setRoleId(isSuper ? 1 : 2);
      } catch {
        setRoleId(2); // fallback aman: admin fitur
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, initialRoleId]);

  // Data
  const [booking, setBooking] = useState(null); // BI-DRIVE
  const [detail, setDetail] = useState(null);   // layanan lain
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingGeneric, setIsUpdatingGeneric] = useState(false);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);

  const [showKontakPopup, setShowKontakPopup] = useState(false);
  const [exporting, setExporting] = useState(false);

  // In DetailsLaporanView
  const detailRef = useRef(null);

  // State for Reject/Cancel process
  const [isCancelling, setIsCancelling] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [pendingReason, setPendingReason] = useState(''); // Unified reason state
  const [showRejectSend, setShowRejectSend] = useState(false); // For the second step of reject
  const [showCancelSend, setShowCancelSend] = useState(false);
  const [reasonPopupConfig, setReasonPopupConfig] = useState(null); // Controls the reason popup
  const [finishing, setFinishing] = useState(false);

  // ✅ Notifikasi (PopupAdmin)
  const [showNotif, setShowNotif] = useState(false);
  const [notif, setNotif] = useState({ message: '', type: 'success' });
  const openNotif = (message, type = 'success') => { setNotif({ message, type }); setShowNotif(true); };

  /* ===== FETCH utama ===== */
  useEffect(() => {
    if (!router.isReady || !id) return;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (slug === 'bidrive') {
          const r = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
          if (!r.ok) throw new Error('Gagal memuat data booking');
          const d = await r.json();
          setBooking(d);

          const r2 = await fetch(`/api/bookingsAssigned?bookingId=${id}`);
          if (r2.ok) {
            const d2 = await r2.json();
            setBooking(prev => prev ? { ...prev, assigned_drivers: d2.drivers, assigned_vehicles: d2.vehicles } : prev);
          }

          const r3 = await fetch('/api/drivers?status=available');
          if (r3.ok) {
            const d3 = await r3.json();
            setAvailableDrivers(Array.isArray(d3) ? d3 : []);
          }

          const typeIds = (d?.vehicle_types || []).map(v => v.id).filter(Boolean);
          const qs = typeIds.length ? `&type_id=${typeIds.join(',')}` : '';
          const r4 = await fetch(`/api/vehicles?status=available${qs}`);
          if (r4.ok) {
            const d4 = await r4.json();
            setAvailableVehicles(Array.isArray(d4) ? d4 : []);
          }
        } else {
          const r = await fetch(`/api/admin/detail/${apiSlug}?id=${id}`);
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error(j?.error || 'Gagal memuat detail');
          setDetail(j.item || null);
        }
      } catch (e) {
        setError(e.message || 'Terjadi kesalahan');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [router.isReady, id, slug, apiSlug]);

  /* ========= Aksi BI-DRIVE ========= */
  const handleSubmitPersetujuan = async ({ driverIds, vehicleIds, keterangan }) => {
    if (slug !== 'bidrive' || !booking) return;
    setIsUpdating(true);
    try {
      if ((driverIds?.length || 0) !== Number(booking.jumlah_driver)) {
        openNotif(`Jumlah driver yang dipilih harus tepat ${booking.jumlah_driver}.`, 'error');
        setIsUpdating(false);
        return;
      }
      if (!vehicleIds?.length) {
        openNotif('Pilih kendaraan dulu ya.', 'error');
        setIsUpdating(false);
        return;
      }
      const resAssign = await fetch('/api/booking?action=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', bookingId: Number(id), driverIds, vehicleIds, keterangan, updateStatusTo: 2 }),
      });
      const assignJson = await resAssign.json().catch(() => ({}));
      if (!resAssign.ok || assignJson?.error) throw new Error(assignJson?.error || 'Gagal menyimpan penugasan.');

      // Update status driver/vehicle
      await Promise.all(
        vehicleIds.map(async (vehId) => {
          const r = await fetch('/api/updateVehiclesStatus', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vehicleId: Number(vehId), newStatusId: 4 }),
          });
          if (!r.ok) throw new Error(`Gagal update vehicle ${vehId}`);
        })
      );
      await Promise.all(
        driverIds.map(async (driverId) => {
          const r = await fetch('/api/updateDriversStatus', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ driverId: Number(driverId), newStatusId: 3 }),
          });
          if (!r.ok) throw new Error(`Gagal update driver ${driverId}`);
        })
      );

      openNotif('Persetujuan berhasil diproses.', 'success');
      setTimeout(() => router.push(withNs('/Admin/HalamanUtama/hal-utamaAdmin', ns)), 1200);
    } catch (err) {
      openNotif(`Error: ${err.message || err}`, 'error');
    } finally {
      setIsUpdating(false);
      setShowPopup(false);
    }
  };

  const handleFinishBooking = async () => {
    setFinishing(true);
    try {
      const res = await fetch(`/api/admin/finish/${apiSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'Gagal menandai selesai.');

      // update UI optimistis
      if (slug === 'bidrive') {
        setBooking(prev => prev ? { 
          ...prev, 
          status_id: 4, 
          finished_at: new Date().toISOString() 
        } : null);
      } else {
        setDetail(prev => prev ? { 
          ...prev, 
          status_id: 4, 
          finished_at: new Date().toISOString() 
        } : null);
      }

      openNotif('Booking berhasil diselesaikan', 'success');
      setTimeout(() => router.push(withNs('/Admin/Persetujuan/hal-persetujuan', ns)), 1200);
    } catch (err) {
      openNotif(`Error: ${err.message || err}`, 'error');
    } finally {
      setFinishing(false);
    }
  };


  // This function will open the popup in "Reject" mode
  const openRejectPopup = () => {
    setReasonPopupConfig({
      title: `Alasan Penolakan ${META[slug]?.title || ''}`,
      placeholder: 'Contoh: Dokumen tidak lengkap',
      actionButtonText: 'Lanjut Tolak',
      onNext: handleRejectStep1Done, // Your existing reject handler
    });
  };

  const openCancelPopup = () => {
    setReasonPopupConfig({
      title: `Alasan Pembatalan ${META[slug]?.title || ''}`,
      placeholder: 'Contoh: Perubahan jadwal mendadak',
      actionButtonText: 'Lanjut Batalkan',
      onNext: handleCancelStep1Done,
    });
  };

  const handleCancelStep1Done = (reasonText) => {
    setPendingReason(reasonText);
    setReasonPopupConfig(null);
    setShowCancelSend(true);
  };


  const handleCancelStep2Submit = async (reasonText, openWhatsApp, messageText) => {
    const reason = reasonText.trim();
    setIsCancelling(true);
    try {
      const res = await fetch(`/api/admin/cancel/${apiSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), reason }),
      });
      if (!res.ok) throw new Error('Gagal membatalkan booking');

      if (openWhatsApp) {
        const person = pickPersonForWA(slug, booking, detail);
        const target = toWaNumber(person?.phone);
        const msg = (messageText || buildCancelPreview(slug, person, reason)).trim();
        if (target) window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      openNotif('Booking berhasil dibatalkan.', 'success');
      router.push(withNs('/Admin/Persetujuan/hal-persetujuan', ns));
    } catch (err) {
      openNotif(`Error: ${err.message}`, 'error');
    } finally {
      setIsCancelling(false);
      setShowRejectSend(false);
    }
  };


  /* ========= REJECT (2 langkah) ========= */
  const handleRejectStep1Done = (reasonText) => {
    setPendingReason(reasonText); // <-- Use the new state setter
    setReasonPopupConfig(null); // <-- Close the popup by clearing the config
    setShowRejectSend(true);
  };

  const handleRejectStep2Submit = async (reasonText, openWhatsApp, messageText) => {
    const reason = (reasonText || '').trim();
    if (!reason) { openNotif('Alasan kosong.', 'error'); return; }

    setRejectLoading(true);
    try {
      const res = await fetch(`/api/admin/reject/${apiSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id), reason })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'Gagal menolak.');

      if (slug === 'bidrive') {
        const r = await fetch(`/api/bookings-with-vehicle?bookingId=${id}`);
        setBooking(await r.json());
      } else {
        const r = await fetch(`/api/admin/detail/${apiSlug}?id=${id}`);
        const d = await r.json(); setDetail(d.item || null);
      }

      if (openWhatsApp) {
        const person = pickPersonForWA(slug, booking, detail);
        const target = toWaNumber(person?.phone);
        const msg = (messageText || buildRejectPreview(slug, person, reason)).trim();
        if (target) window.open(`https://wa.me/${target}?text=${encodeURIComponent(msg)}`, '_blank');
      }

      openNotif('Permohonan berhasil ditolak.', 'success');
      setTimeout(() => router.push(withNs('/Admin/HalamanUtama/hal-utamaAdmin', ns)), 1200);
      setShowRejectSend(false);
      setPendingReason('');
    } catch (e) {
      openNotif(`Error: ${e.message || e}`, 'error');
    } finally {
      setRejectLoading(false);
    }
  };

  /* ===== Approve generic (selain BI.DOCS) ===== */
  /* ===== Approve generic (selain BI.DOCS) ===== */
  const handleApproveGeneric = async () => {
    if (slug === 'bimail') return false;
    setIsUpdatingGeneric(true);
    try {
      const res = await fetch(`/api/admin/approve/${apiSlug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: Number(id) }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.error) throw new Error(j?.error || 'Gagal menyetujui.');

      const svc = META[slug]?.title || slug.toUpperCase();
      openNotif(`Pengajuan ${svc} Berhasil!`, 'success');

      // ⬇️ redirect otomatis ke daftar persetujuan setelah 1.2s
      setTimeout(() => {
        router.push(withNs('/Admin/Persetujuan/hal-persetujuan', ns));
      }, 1200);

      return true;
    } catch (err) {
      openNotif(`Error: ${err.message || err}`, 'error');
      return false;
    } finally {
      setIsUpdatingGeneric(false);
    }
  };

  /* ===== Export PDF ===== */
  const handleExportPDF = async () => {
    try {
      const el = detailRef.current;
      if (!el) return;
      setExporting(true);
      await new Promise((r) => requestAnimationFrame(r));
      const html2canvas = (await import('html2canvas')).default;
      const { jsPDF } = await import('jspdf');
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, windowWidth: el.scrollWidth });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
        heightLeft -= pageH;
      }
      pdf.save(`detail-${slug}-${id}.pdf`);
    } catch (e) {
      openNotif('Gagal mengekspor PDF. ' + e.message, 'error');
    } finally {
      setExporting(false);
    }
  };


  /* ===== UI guard ===== */
  if (isLoading) return (
    <div className={styles.loadingState} role="status" aria-live="polite">
      <span className={styles.loaderRing} aria-hidden="true" />
      <p className={styles.loadingText}>Memuat detail laporan…</p>
    </div>
  );
  if (error) return <div className={styles.errorState}>Error: {error}</div>;

  const titleService = META[slug]?.title || slug.toUpperCase();

  // Logout (pakai API + redirect Signin Admin)
  const doLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp onLogout={() => setShowLogoutPopup(true)} />}

      <main className={styles.mainContent}>
        <div className={styles.header} />

        <div className={styles.titleBox}>
          <button className={styles.backBtn} onClick={() => router.back()}>
            <FaArrowLeft style={{ marginRight: 7, fontSize: 18 }} /> Kembali
          </button>
          <div className={styles.title}>DETAIL LAPORAN • {titleService}</div>
        </div>

        {/* ==================== PER MODUL ==================== */}
        {slug === 'bidrive' ? (
          <div ref={detailRef}>
            <BiDriveSection
              styles={styles}
              booking={booking}
              isUpdating={isUpdating}
              exporting={exporting}
              onRequestReject={openRejectPopup}   // <-- Use the new function here
              onRequestCancel={openCancelPopup} // <-- Add this new prop
              isCancelling={isCancelling}       // <-- Add this new prop
              onRequestApprove={() => setShowPopup(true)}
              finishing={finishing}
              onFinishBooking={handleFinishBooking}
              onOpenKontak={() => setShowKontakPopup(true)}
              onExportPDF={handleExportPDF}
              STATUS_CONFIG={STATUS_CONFIG}
              formatDateTime={formatDateTime}
              formatDateOnly={formatDateOnly}
              formatDuration={formatDuration}
              getPlate={getPlate}
              getStatusId={(b,d) => getStatusId('bidrive', b, d)}
            />
          </div>
        ) : (
          <div ref={detailRef}>
            {slug === 'bicare' && (
              <BiCareSection
                styles={styles}
                id={id}
                detail={detail}
                formatDateOnly={formatDateOnly}
                formatDateTime={formatDateTime}
                mapStatus={(d) => mapStatus(d, 'bicare')}
              />
            )}
            {slug === 'bimeet' && (
              <BiMeetSection
                styles={styles}
                id={id}
                detail={detail}
                formatDateTime={formatDateTime}
                mapStatus={mapStatus}
                isPendingGeneric={isPendingGeneric}
                isUpdatingGeneric={isUpdatingGeneric}
                onRequestReject={openRejectPopup}   // <-- Use the new function here
                onRequestCancel={openCancelPopup} // <-- Add this new prop
                isCancelling={isCancelling}       // <-- Add this new prop
                onApproveGeneric={handleApproveGeneric}
                onFinishBooking={handleFinishBooking}
                finishing={finishing}

              />
            )}
            {slug === 'bistay' && (
              <BiStaySection
                styles={styles}
                id={id}
                detail={detail}
                formatDateTime={formatDateTime}
                mapStatus={mapStatus}
                isPendingGeneric={isPendingGeneric}
                isUpdatingGeneric={isUpdatingGeneric}
                onRequestReject={openRejectPopup}   // <-- Use the new function here
                onRequestCancel={openCancelPopup} // <-- Add this new prop
                isCancelling={isCancelling}       // <-- Add this new prop
                onApproveGeneric={handleApproveGeneric}
                statusPegawaiList={statusPegawaiData}
                finishing={finishing}
                onFinishBooking={handleFinishBooking}
              />
            )}
            {slug === 'bimail' && (
              <BiMailSection
                styles={styles}
                id={id}
                detail={detail}
                formatDateOnly={formatDateOnly}
                formatDateTime={formatDateTime}
                mapStatus={mapStatus}
              />
            )}
            {slug === 'bimeal' && (
              <BiMealSection
                styles={styles}
                id={id}
                detail={detail}
                formatDateTime={formatDateTime}
                mapStatus={mapStatus}
                isPendingGeneric={isPendingGeneric}
                isUpdatingGeneric={isUpdatingGeneric}
                onRequestReject={openRejectPopup}   
                onRequestCancel={openCancelPopup} 
                isCancelling={isCancelling}       
                onApproveGeneric={handleApproveGeneric}
                finishing={finishing}
                onFinishBooking={handleFinishBooking}
              />
            )}
          </div>
        )}
      </main>

      {/* Popups */}
      <KontakDriverPopup
        show={showKontakPopup}
        onClose={() => setShowKontakPopup(false)}
        drivers={booking?.assigned_drivers || []}
        booking={booking || {}}
      />

      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={doLogout} />

      <PersetujuanPopup
        show={showPopup}
        onClose={() => setShowPopup(false)}
        onSubmit={handleSubmitPersetujuan}
        detail={booking || {}}
        driverList={availableDrivers}
        vehicleList={availableVehicles}
      />

      {/* Step 1: input alasan */}
      <RejectReasonPopup
        show={!!reasonPopupConfig}
        onClose={() => setReasonPopupConfig(null)}
        onNext={reasonPopupConfig?.onNext}
        title={reasonPopupConfig?.title}
        placeholder={reasonPopupConfig?.placeholder}
        actionButtonText={reasonPopupConfig?.actionButtonText}
      />

      {/* Step 2: kirim WA + simpan */}
      <RejectVerificationPopup
        show={showRejectSend}
        onClose={() => setShowRejectSend(false)}
        onSubmit={handleRejectStep2Submit}
        loading={rejectLoading}
        person={pickPersonForWA(slug, booking, detail)}
        titleText={`Kirimkan Pesan Penolakan ${META[slug]?.title || ''}`}
        infoText="Periksa / ubah pesan yang akan dikirim via WhatsApp. Klik 'Tolak & Kirim' untuk menyimpan dan (opsional) mengirim."
        previewBuilder={(person, r) => buildRejectPreview(slug, person, r)}
        initialReason={pendingReason}
      />
      <CancelVerificationPopup
        show={showCancelSend}
        onClose={() => setShowCancelSend(false)}
        onSubmit={handleCancelStep2Submit}
        loading={isCancelling}
        person={pickPersonForWA(slug, booking, detail)}
        previewBuilder={(person, r) => buildCancelPreview(slug, person, r)}
        initialReason={pendingReason}
      />


      {/* Notifikasi Global */}
      {showNotif && <PopupAdmin message={notif.message} type={notif.type} onClose={() => setShowNotif(false)} />}
    </div>
  );
}

/* ====== SSR guard (boleh role 1 & 2) ====== */
export async function getServerSideProps(ctx) {
  const from = ctx.resolvedUrl || '/Admin/DetailsLaporan/hal-detailslaporan';

  const ns = getNsFromReq(ctx.req) || ctx.query?.ns;
  if (!ns || !NS_RE.test(ns)) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }


  const auth = await verifyAuth(ctx.req, ['super_admin', 'admin_fitur'], 'admin');

  if (!auth.ok) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  const rId = Number(auth.payload?.role_id ?? 0);
  const rStr = String(auth.payload?.role || '').toLowerCase();
  const isSuper = rId === 1 || ['super_admin','superadmin','super-admin'].includes(rStr);

  return { props: { initialRoleId: isSuper ? 1 : 2 } };
}
