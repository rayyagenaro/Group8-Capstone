// pages/Admin/Pengaturan/hal-pengaturan.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import styles from './pengaturan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { useRouter } from 'next/router';
import { FaEdit, FaCheck, FaTimes, FaLock, FaUserShield } from 'react-icons/fa';
import Pagination from '@/components/Pagination/Pagination';

// Popup preview WA (verifikasi & penolakan)
import VerifyVerificationPopup from '@/components/verifyVerification/VerifyVerification';
// Popup minta alasan singkat
import ReasonPopup from '@/components/rejectReason/ReasonPopup';
import { jwtVerify } from "jose";
import { getNsFromReq } from "@/lib/ns-server";

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

/* ============================================================
   TABS: urutan baru -> Pending -> Verified -> Rejected
   ============================================================ */
const TABS = [
  { key: 'pending',  label: 'Pending',  statusId: 1 },
  { key: 'verified', label: 'Verified', statusId: 2 },
  { key: 'rejected', label: 'Rejected', statusId: 3 },
];

const STATUS_PILL = {
  1: { text: 'Pending',  className: styles.pillPending  },
  2: { text: 'Verified', className: styles.pillVerified },
  3: { text: 'Rejected', className: styles.pillRejected },
};

/* ===== Utils WA ===== */
const to62 = (p) => {
  if (!p) return '';
  let s = String(p).replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('62')) return s;
  if (s.startsWith('0')) return '62' + s.slice(1);
  return /^\d+$/.test(s) ? '62' + s : '';
};
const waLink = (phone, text) => {
  const n = to62(phone);
  if (!n) return '';
  const t = text ? encodeURIComponent(text) : '';
  return `https://wa.me/${n}${t ? `?text=${t}` : ''}`;
};
/** Open wa.me without popup blocker */
function openWhatsAppSafely(link) {
  if (!link) return;
  const tab = window.open('', '_blank'); // user gesture
  if (tab) {
    try { tab.location.replace(link); tab.opener = null; return; } catch {}
  }
  window.open(link, '_blank');
}

/* ===== Helper domain email (untuk limit layanan) ===== */
function getEmailDomain(email = '') {
  const at = String(email).toLowerCase().trim().split('@');
  return at.length === 2 ? at[1] : '';
}

/* ===== Template builders ===== */
// USER (reject)
const userRejectTemplate = (u, reason) => `Halo ${u?.name || ''},

Pengajuan akun BI-ONE Anda *DITOLAK* ❌

Detail:
• Nama : ${u?.name || '-'}
• NIP  : ${u?.nip || '-'}
• Email: ${u?.email || '-'}

Alasan penolakan:
${reason}

Silakan lengkapi/benahi data Anda lalu ajukan kembali verifikasi.
Terima kasih.`;

// ADMIN (reject)
const adminRejectTemplate = (a, reason) => `Halo ${a?.name || a?.nama || ''},

Pengajuan akun *Admin BI-ONE* Anda *DITOLAK* ❌

Detail:
• Nama    : ${a?.name || a?.nama || '-'}
• Email   : ${a?.email || '-'}
• Role    : ${Number(a?.role_id) === 1 ? 'Super Admin' : 'Admin Fitur'}
• Layanan : ${(a?.services || []).join(', ') || '-'}

Alasan penolakan:
${reason}

Silakan perbaiki data/ajukan ulang. Terima kasih.`;

// ADMIN (verify)
const adminVerifyTemplate = (a) => `Halo ${a?.name || a?.nama || ''},

Pengajuan akun *Admin BI-ONE* Anda telah *TERVERIFIKASI* ✅

Detail:
• Nama    : ${a?.name || a?.nama || '-'}
• Email   : ${a?.email || '-'}
• Role    : ${Number(a?.role_id) === 1 ? 'Super Admin' : 'Admin Fitur'}
• Layanan : ${(a?.services || []).join(', ') || '-'}

Silakan login ke BI.ONE Admin. Terima kasih.`;

/* ===== Page ===== */
export default function Pengaturan({
  initialAdminName = "Admin",
  initialRoleId = null,
  ns = null,
}) {

  

  const router = useRouter();

  // users | admins
  const [entityType, setEntityType] = useState('users');
  const [activeTab, setActiveTab] = useState('pending');

  // data & paging
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // global ui
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // user edit
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [showEditPasswordPopup, setShowEditPasswordPopup] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [editForm, setEditForm] = useState({ id: '', name: '', email: '', phone: '' });
  const [editPasswordForm, setEditPasswordForm] = useState({ id: '', password: '', adminPassword: '' });
  const [editErrors, setEditErrors] = useState({});
  const [editPasswordErrors, setEditPasswordErrors] = useState({});

  // verify preview
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // REJECT flow (2 langkah)
  const [askReasonUser, setAskReasonUser] = useState(false);
  const [askReasonAdmin, setAskReasonAdmin] = useState(false);
  const [pendingReason, setPendingReason] = useState('');
  const [showRejectPreviewUser, setShowRejectPreviewUser] = useState(false);
  const [showRejectPreviewAdmin, setShowRejectPreviewAdmin] = useState(false);
  const [previewMessage, setPreviewMessage] = useState('');

  // lihat alasan
  const [showReasonPopup, setShowReasonPopup] = useState(false);
  const [reasonRow, setReasonRow] = useState(null);
  const openReason = (u) => { setReasonRow(u); setShowReasonPopup(true); };
  const closeReason = () => { setShowReasonPopup(false); setReasonRow(null); };

  // admin lokal (khusus ganti password user)
  const [admin, setAdmin] = useState(null);
  useEffect(() => {
    try {
      const adminData = typeof window !== 'undefined' ? localStorage.getItem('admin') : null;
      if (adminData) setAdmin(JSON.parse(adminData));
    } catch {}
  }, []);

  const activeStatusId = useMemo(
    () => TABS.find((t) => t.key === activeTab)?.statusId,
    [activeTab]
  );

  // data source
  const baseUrl = useMemo(
    () => (entityType === 'users' ? '/api/users' : '/api/admin/admins'),
    [entityType]
  );
  const query = useMemo(
    () => `?page=${pagination.currentPage}&limit=${itemsPerPage}&verification=${activeTab}`,
    [pagination.currentPage, itemsPerPage, activeTab]
  );

  // fetch list
  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    setErrorMsg('');
    (async () => {
      try {
        const res = await fetch(`${baseUrl}${query}`, { signal: ac.signal, cache: 'no-store' });
        const result = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(result?.error || 'Gagal mengambil data');
        setRows(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination || { currentPage: 1, totalPages: 1, totalItems: 0 });
      } catch (e) {
        if (e.name !== 'AbortError') {
          setRows([]);
          setErrorMsg(e.message || 'Terjadi kesalahan jaringan');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [baseUrl, query]);

  const handlePageChange = (page) => setPagination((p) => ({ ...p, currentPage: page }));
  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setPagination((p) => ({ ...p, currentPage: 1 }));
  };

  const afterRowRemoved = useCallback(() => {
    setPagination((p) => {
      const next = { ...p };
      if (rows.length <= 1 && p.currentPage > 1) next.currentPage = 1;
      return next;
    });
  }, [rows.length]);

  const pillOf = (id) => STATUS_PILL[id] || STATUS_PILL[1];

  /* ===== USER: edit ===== */
  function openEditPopup(u) {
    setSelectedRow(u);
    setEditForm({ id: u.id, name: u.name || '', email: u.email || '', phone: u.phone || '' });
    setEditErrors({});
    setShowEditPopup(true);
  }
  function handleEditChange(e) {
    setEditForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setEditErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  }
  async function handleEditSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editForm.name?.trim()) err.name = 'Nama wajib diisi';
    if (!editForm.phone?.trim()) err.phone = 'No HP wajib diisi';
    setEditErrors(err);
    if (Object.keys(err).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Update gagal');

      setShowEditPopup(false);
      setRows((prev) => prev.map((u) => (u.id === editForm.id ? { ...u, ...editForm } : u)));
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
    } catch (e) {
      alert(e.message || 'Update gagal');
    }
  }

  /* ===== USER: change password ===== */
  function openEditPasswordPopup(u) {
    setSelectedRow(u);
    setEditPasswordForm({ id: u.id, password: '', adminPassword: '' });
    setEditPasswordErrors({});
    setShowEditPasswordPopup(true);
  }
  function handleEditPasswordChange(e) {
    setEditPasswordForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setEditPasswordErrors((errs) => ({ ...errs, [e.target.name]: undefined }));
  }
  async function handleEditPasswordSubmit(e) {
    e.preventDefault();
    const err = {};
    if (!editPasswordForm.password) err.password = 'Password baru wajib diisi';
    else if ((editPasswordForm.password || '').length < 5) err.password = 'Minimal 5 karakter';
    if (!editPasswordForm.adminPassword) err.adminPassword = 'Password admin wajib diisi';
    setEditPasswordErrors(err);
    if (Object.keys(err).length) return;

    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editPasswordForm.id,
          password: editPasswordForm.password,
          adminPassword: editPasswordForm.adminPassword,
          emailAdmin: admin?.email || null,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(result?.error || 'Verifikasi admin gagal!');
      setShowEditPasswordPopup(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
    } catch (e) {
      setEditPasswordErrors((errs) => ({ ...errs, adminPassword: e.message || 'Update gagal' }));
    }
  }

  /* ===========================================================
     ADMIN: verify / reject (dua langkah) + EDIT AKSES (LIMIT DINAMIS)
     =========================================================== */

  // --- state popup Edit Akses ---
  const [showEditAccessPopup, setShowEditAccessPopup] = useState(false);
  const [allServices, setAllServices] = useState([]);           // [{id,name}]
  const [pickedServiceIds, setPickedServiceIds] = useState([]); // [id,id]
  const [maxServices, setMaxServices] = useState(2);            // dinamis: @umi.com=4, lainnya=2

  function openVerifyAdmin(a) {
    setSelectedRow({
      id: a.id, name: a.nama, email: a.email, phone: a.phone || '',
      role_id: a.role_id, services: a.services || [],
    });
    setShowVerifyPopup(true);
  }

  function openRejectAdmin(a) {
    setSelectedRow({
      id: a.id, name: a.nama, email: a.email, phone: a.phone || '',
      role_id: a.role_id, services: a.services || [],
    });
    setPendingReason('');
    setAskReasonAdmin(true);
  }

  // --- USER: verify / reject ---
  function openVerifyUser(u) {
    setSelectedRow({
      id: u.id,
      name: u.name,
      nip: u.nip,
      email: u.email,
      phone: u.phone || '',
    });
    setShowVerifyPopup(true);
  }

  function openRejectUser(u) {
    setSelectedRow({
      id: u.id,
      name: u.name,
      nip: u.nip,
      email: u.email,
      phone: u.phone || '',
    });
    setPendingReason('');
    setAskReasonUser(true);
  }

  function proceedRejectAdmin(reason) {
    setPendingReason(reason);
    const msg = adminRejectTemplate(selectedRow || {}, reason);
    setPreviewMessage(msg);
    setAskReasonAdmin(false);
    setShowRejectPreviewAdmin(true);
  }

  async function submitVerifyAdmin(messageText, shouldOpenWA) {
    if (!selectedRow) return;
    try {
      const wa = shouldOpenWA && selectedRow.phone ? waLink(selectedRow.phone, messageText || '') : '';

      const res = await fetch('/api/admin/admin-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: selectedRow.id, action: 'verify' }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal verifikasi admin');

      if (wa) openWhatsAppSafely(wa);
      setRows((prev) => prev.filter((r) => r.id !== selectedRow.id));
      setSelectedRow(null);
      setShowVerifyPopup(false);
      afterRowRemoved();
    } catch (e) {
      alert(e.message || 'Gagal verifikasi admin');
    }
  }

  async function submitRejectAdmin(messageText, shouldOpenWA) {
    if (!selectedRow) return;
    const reason = (pendingReason || '').trim();
    if (!reason) return alert('Alasan penolakan kosong.');

    try {
      const wa = shouldOpenWA && selectedRow.phone ? waLink(selectedRow.phone, messageText || '') : '';

      const res = await fetch('/api/admin/admin-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: selectedRow.id, action: 'reject', reason }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal menolak admin');

      if (wa) openWhatsAppSafely(wa);
      setRows((prev) => prev.filter((r) => r.id !== selectedRow.id));
      setSelectedRow(null);
      setShowRejectPreviewAdmin(false);
      afterRowRemoved();
    } catch (e) {
      alert(e.message || 'Gagal menolak admin');
    }
  }

  // --- Buka popup Edit Akses ---
  async function openEditAccess(adminRow) {
    if (Number(adminRow.role_id) === 1) return; // cegah edit Super Admin

    setSelectedRow({
      id: adminRow.id,
      name: adminRow.nama,
      email: adminRow.email,
      role_id: adminRow.role_id,
      services: adminRow.services || [],
    });

    // SET LIMIT DINAMIS: @umi.com => 4, lainnya => 2
    const domain = getEmailDomain(adminRow.email);
    const limit = domain === 'umi.com' ? 4 : 2;
    setMaxServices(limit);

    try {
      setLoading(true);
      const [allRes, mineRes] = await Promise.all([
        fetch('/api/admin/admin-services', { cache: 'no-store' }),
        fetch(`/api/admin/admin-services?adminId=${adminRow.id}`, { cache: 'no-store' }),
      ]);
      const all = await allRes.json().catch(() => []);
      const mine = await mineRes.json().catch(() => ({ services: [] }));

      setAllServices(Array.isArray(all) ? all : []);
      const pickedIds = Array.isArray(mine?.services) ? mine.services.map((s) => s.id) : [];

      // Jika sebelumnya > limit baru, pangkas agar UI & submit konsisten
      setPickedServiceIds(pickedIds.slice(0, limit));

      setShowEditAccessPopup(true);
    } catch (e) {
      alert(e?.message || 'Gagal memuat layanan');
    } finally {
      setLoading(false);
    }
  }

  function togglePickService(id) {
    setPickedServiceIds((prev) => {
      if (prev.includes(id)) {
        // uncheck
        return prev.filter((x) => x !== id);
      }
      // tambahkan hanya jika belum mencapai limit dinamis
      if (prev.length >= maxServices) {
        alert(`Maksimal ${maxServices} layanan untuk Admin Fitur.`);
        return prev;
      }
      return [...prev, id];
    });
  }

  async function submitEditAccess(e) {
    e?.preventDefault?.();
    if (!selectedRow?.id) return;

    if (pickedServiceIds.length > maxServices) {
      alert(`Maksimal ${maxServices} layanan untuk Admin Fitur.`);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/admin/admin-services', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: selectedRow.id,
          serviceIds: pickedServiceIds,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || 'Gagal menyimpan akses');

      // update label layanan pada tabel (optimistic)
      const id2name = new Map(allServices.map((s) => [s.id, s.name]));
      const newNames = pickedServiceIds.map((id) => id2name.get(id)).filter(Boolean);

      setRows((prev) =>
        prev.map((r) =>
          r.id === selectedRow.id ? { ...r, services: newNames } : r
        )
      );

      setShowEditAccessPopup(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1400);
    } catch (e) {
      alert(e?.message || 'Gagal menyimpan akses');
    } finally {
      setLoading(false);
    }
  }

  /* ===== Logout ===== */
  const handleLogout = async () => {
    try {
      const ns = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  /* ===== table render ===== */
  const colSpan = useMemo(() => {
    if (entityType === 'users') return activeStatusId === 2 ? 8 : 7;
    return 6;
  }, [entityType, activeStatusId]);

  const renderTableHead = () => {
    if (entityType === 'users') {
      return (
        <tr>
          <th style={{ width: 55 }}>ID</th>
          <th>Nama</th>
          <th>NIP</th>
          <th>Phone</th>
          <th>Email</th>
          <th style={{ width: 140 }}>Status</th>
          {activeStatusId === 2 && <th>Password</th>}
          <th style={{ width: activeStatusId === 1 ? 260 : 180 }}>Aksi</th>
        </tr>
      );
    }
    return (
      <tr>
        <th style={{ width: 55 }}>ID</th>
        <th>Nama</th>
        <th>Email</th>
        <th>Role</th>
        <th style={{ width: 140 }}>Status</th>
        <th style={{ width: activeStatusId === 1 ? 220 : 200 }}>Aksi</th>
      </tr>
    );
  };

  const renderTableBody = () => {
    if (loading) {
      return <tr><td colSpan={colSpan} className={styles.centerMuted}>Memuat data…</td></tr>;
    }
    if (errorMsg) {
      return <tr><td colSpan={colSpan} className={styles.centerError}>{errorMsg}</td></tr>;
    }
    if (!rows.length) {
      return (
        <tr>
          <td colSpan={colSpan} className={styles.centerMuted}>
            {activeTab === 'verified'
              ? `Belum ada ${entityType === 'users' ? 'user' : 'admin'} terverifikasi.`
              : activeTab === 'pending'
              ? `Tidak ada ${entityType === 'users' ? 'user' : 'admin'} pending.`
              : `Tidak ada ${entityType === 'users' ? 'user' : 'admin'} ditolak.`}
          </td>
        </tr>
      );
    }

    if (entityType === 'users') {
      return rows.map((u) => {
        const pill = pillOf(u.verification_status_id);
        return (
          <tr key={u.id}>
            <td>{u.id}</td>
            <td style={{ fontWeight:'bold' }}>{u.name}</td>
            <td>{u.nip || '-'}</td>
            <td>{u.phone || '-'}</td>
            <td>{u.email}</td>
            <td><span className={`${styles.statusPill} ${pill.className}`}>{pill.text}</span></td>
            {activeStatusId === 2 && (
              <td>
                <button className={styles.editBtn} onClick={() => openEditPasswordPopup(u)}>
                  <FaLock style={{ marginRight:4 }} /> Ganti Password
                </button>
              </td>
            )}
            <td className={styles.actionCell}>
              <button className={styles.editGhostBtn} onClick={() => openEditPopup(u)}>
                <FaEdit style={{ marginRight:6 }} /> Edit User
              </button>

              {activeStatusId === 1 && (
                <div className={styles.splitGroup}>
                  <button className={`${styles.splitBtn} ${styles.approve}`} onClick={() => openVerifyUser(u)}>
                    <FaCheck style={{ marginRight:6 }} /> Verifikasi
                  </button>
                  <button className={`${styles.splitBtn} ${styles.reject}`} onClick={() => openRejectUser(u)}>
                    <FaTimes style={{ marginRight:6 }} /> Tolak
                  </button>
                </div>
              )}

              {u.verification_status_id === 3 && u.rejection_reason && (
                <button
                  type="button"
                  className={styles.reasonBtn || styles.editBtn}
                  onClick={() => openReason(u)}
                  style={{ marginLeft:8 }}
                >
                  Lihat Alasan
                </button>
              )}
            </td>
          </tr>
        );
      });
    }

    // admins
    return rows.map((a) => {
      const pill = pillOf(a.verification_id);
      const roleText = Number(a.role_id) === 1 ? 'Super Admin' : 'Admin Fitur';
      const isSuper = Number(a.role_id) === 1;
      const isRejected = Number(a.verification_id) === 3;

      return (
        <tr key={a.id}>
          <td>{a.id}</td>
          <td style={{ fontWeight:'bold' }}>{a.nama}</td>
          <td>{a.email}</td>
          <td>
            <span title={`role_id=${a.role_id}`}>{roleText}</span>
            {Array.isArray(a.services) && a.services.length > 0 && (
              <div className={styles.servicesHint}>
                Layanan: {a.services.join(', ')}
              </div>
            )}
          </td>
          <td><span className={`${styles.statusPill} ${pill.className}`}>{pill.text}</span></td>
          <td className={styles.actionCell}>
            {activeStatusId === 1 ? (
              <div className={styles.splitGroup}>
                <button className={`${styles.splitBtn} ${styles.approve}`} onClick={() => openVerifyAdmin(a)} disabled={loading}>
                  <FaUserShield style={{ marginRight:6 }} /> Verifikasi
                </button>
                <button className={`${styles.splitBtn} ${styles.reject}`} onClick={() => openRejectAdmin(a)} disabled={loading}>
                  <FaTimes style={{ marginRight:6 }} /> Tolak
                </button>
              </div>
            ) : (
              <>
                {!isRejected && !isSuper && (
                  <button
                    className={styles.editGhostBtn}
                    onClick={() => openEditAccess(a)}
                    title="Edit layanan yang dipegang admin ini"
                  >
                    <FaEdit style={{ marginRight:6 }} /> Edit Akses
                  </button>
                )}

                {a.verification_id === 3 && a.rejection_reason && (
                  <button
                    type="button"
                    className={styles.reasonBtn || styles.editBtn}
                    onClick={() => openReason({ ...a, name: a.nama })}
                    style={{ marginLeft:8 }}
                  >
                    Lihat Alasan
                  </button>
                )}
              </>
            )}
          </td>
        </tr>
      );
    });
  };

  const resultsRangeText = useMemo(() => {
    if (!pagination?.totalItems) return '';
    const start = (pagination.currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(pagination.currentPage * itemsPerPage, pagination.totalItems);
    return `Results: ${start} - ${end} of ${pagination.totalItems}`;
  }, [pagination, itemsPerPage]);

  /* ========= helper kelas tombol status berwarna ========= */
  const tabClass = (key, isActive) => {
    const base = styles.tabBtn;
    if (key === 'pending')  return `${base} ${isActive ? styles.tabPendingActive  : styles.tabPending}`;
    if (key === 'verified') return `${base} ${isActive ? styles.tabVerifiedActive : styles.tabVerified}`;
    if (key === 'rejected') return `${base} ${isActive ? styles.tabRejectedActive : styles.tabRejected}`;
    return base;
  };

  return (
    <div className={styles.background}>
      <SidebarAdmin onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>PENGATURAN</div>
          </div>

          {/* Switch Users vs Admins */}
          <div className={styles.tabsRow} style={{ marginTop:6, marginBottom:8 }}>
            <button
              className={`${styles.tabBtn} ${entityType === 'users' ? styles.tabActive : ''}`}
              onClick={() => { setEntityType('users'); setPagination((p) => ({ ...p, currentPage: 1 })); }}
            >
              Users
            </button>
            <button
              className={`${styles.tabBtn} ${entityType === 'admins' ? styles.tabActive : ''}`}
              onClick={() => { setEntityType('admins'); setPagination((p) => ({ ...p, currentPage: 1 })); }}
            >
              Admins
            </button>
          </div>

          {/* Tabs status (warna sesuai permintaan) */}
          <div className={styles.tabsRow}>
            {TABS.map((t) => (
              <button
                key={t.key}
                className={tabClass(t.key, activeTab === t.key)}
                onClick={() => { setActiveTab(t.key); setPagination((p) => ({ ...p, currentPage: 1 })); }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>{renderTableHead()}</thead>
              <tbody>{renderTableBody()}</tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalItems > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>{resultsRangeText}</span>
                <div>
                  <label htmlFor="itemsPerPage" className={styles.label}>Items per page:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    className={styles.itemsPerPageDropdown}
                    aria-label="Items per page"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                  </select>
                </div>
              </div>

              <Pagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                onPageChange={handlePageChange}
              />
            </>
          )}
        </div>
      </main>

      {/* Logout */}
      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />

      {/* Edit Popup (USER) */}
      {showEditPopup && entityType === 'users' && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPopup(false)}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}>Edit User</div>
            <form className={styles.popupForm} onSubmit={handleEditSubmit} autoComplete="off">
              <label htmlFor="editName">Nama</label>
              <input id="editName" name="name" type="text" value={editForm.name} onChange={handleEditChange} autoFocus />
              {editErrors.name && <span className={styles.errorMsg}>{editErrors.name}</span>}

              <label htmlFor="editEmail">Email</label>
              <input id="editEmail" name="email" type="text" value={editForm.email} disabled />

              <label htmlFor="editPhone">Phone</label>
              <input id="editPhone" name="phone" type="text" value={editForm.phone} onChange={handleEditChange} />
              {editErrors.phone && <span className={styles.errorMsg}>{editErrors.phone}</span>}

              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit"><FaCheck /> Simpan</button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditPopup(false)}><FaTimes /> Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Password Popup (USER) */}
      {showEditPasswordPopup && entityType === 'users' && (
        <div className={styles.popupOverlay} onClick={() => setShowEditPasswordPopup(false)}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}><FaLock style={{ marginRight: 7 }} /> Ganti Password User</div>
            <form className={styles.popupForm} onSubmit={handleEditPasswordSubmit} autoComplete="off">
              <label>Password Baru</label>
              <input name="password" type="password" value={editPasswordForm.password} onChange={handleEditPasswordChange} autoFocus />
              {editPasswordErrors.password && <span className={styles.errorMsg}>{editPasswordErrors.password}</span>}

              <label>Password Admin</label>
              <input name="adminPassword" type="password" value={editPasswordForm.adminPassword} onChange={handleEditPasswordChange} placeholder="Masukkan password akun admin" />
              {editPasswordErrors.adminPassword && <span className={styles.errorMsg}>{editPasswordErrors.adminPassword}</span>}

              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit"><FaCheck /> Simpan</button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditPasswordPopup(false)}><FaTimes /> Batal</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== STEP-1 (ASK REASON) ====== */}
      <ReasonPopup
        show={entityType === 'users' && askReasonUser}
        title="Tolak Verifikasi User - Alasan"
        onClose={() => setAskReasonUser(false)}
        onSubmit={(reason) => {
          setPendingReason(reason);
          const msg = userRejectTemplate(selectedRow || {}, reason);
          setPreviewMessage(msg);
          setAskReasonUser(false);
          setShowRejectPreviewUser(true);
        }}
      />
      <ReasonPopup
        show={entityType === 'admins' && askReasonAdmin}
        title="Tolak Verifikasi Admin - Alasan"
        onClose={() => setAskReasonAdmin(false)}
        onSubmit={(reason) => {
          setPendingReason(reason);
          const msg = adminRejectTemplate(selectedRow || {}, reason);
          setPreviewMessage(msg);
          setAskReasonAdmin(false);
          setShowRejectPreviewAdmin(true);
        }}
      />

      {/* ====== VERIFY / REJECT PREVIEW (WA) ====== */}
      {/* VERIFY */}
      <VerifyVerificationPopup
        show={showVerifyPopup}
        onClose={() => setShowVerifyPopup(false)}
        onSubmit={entityType === 'users' ? async (msg, open) => {
          if (!selectedRow) return;
          try {
            setVerifyLoading(true);
            const wa = open && selectedRow.phone ? waLink(selectedRow.phone, msg || '') : '';
            const res = await fetch('/api/user-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: selectedRow.id, action: 'verify' }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || 'Gagal verifikasi user');
            if (wa) openWhatsAppSafely(wa);
            setRows((prev) => prev.filter((u) => u.id !== selectedRow.id));
            setSelectedRow(null);
            setShowVerifyPopup(false);
            afterRowRemoved();
          } catch (e) {
            alert(e.message || 'Gagal verifikasi user');
          } finally {
            setVerifyLoading(false);
          }
        } : submitVerifyAdmin}
        loading={verifyLoading}
        user={{
          name: selectedRow?.name,
          nip: selectedRow?.nip,
          email: selectedRow?.email,
          phone: selectedRow?.phone,
        }}
        defaultMessage={
          entityType === 'admins'
            ? adminVerifyTemplate(selectedRow || {})
            : undefined
        }
        titleText={entityType === 'users' ? 'Verifikasi User' : 'Verifikasi Admin'}
        infoText="Kirim informasi verifikasi. Pesan di bawah bisa kamu edit dulu sebelum dikirim."
        variant="info"
      />

      {/* REJECT PREVIEW (User) */}
      <VerifyVerificationPopup
        show={entityType === 'users' && showRejectPreviewUser}
        onClose={() => setShowRejectPreviewUser(false)}
        onSubmit={async (messageText, shouldOpenWA) => {
          if (!selectedRow) return;
          const reason = (pendingReason || '').trim();
          if (!reason) return alert('Alasan penolakan kosong.');

          try {
            const wa = shouldOpenWA && selectedRow.phone ? waLink(selectedRow.phone, messageText || '') : '';

            const res = await fetch('/api/user-verification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: selectedRow.id, action: 'reject', reason }),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(json?.error || 'Gagal menolak user');

            if (wa) openWhatsAppSafely(wa);
            setRows((prev) => prev.filter((u) => u.id !== selectedRow.id));
            setSelectedRow(null);
            setShowRejectPreviewUser(false);
            afterRowRemoved();
          } catch (e) {
            alert(e.message || 'Gagal menolak user');
          }
        }}
        loading={false}
        defaultMessage={previewMessage}
        user={{ name: selectedRow?.name, email: selectedRow?.email, phone: selectedRow?.phone, nip: selectedRow?.nip }}
        titleText="Tolak Verifikasi User"
        infoText="Kirim informasi penolakan ke user. Pesan berikut masih bisa kamu edit sebelum dikirim."
        variant="danger"
      />

      {/* REJECT PREVIEW (Admin) */}
      <VerifyVerificationPopup
        show={entityType === 'admins' && showRejectPreviewAdmin}
        onClose={() => setShowRejectPreviewAdmin(false)}
        onSubmit={submitRejectAdmin}
        loading={false}
        defaultMessage={previewMessage}
        user={{ name: selectedRow?.name, email: selectedRow?.email, phone: selectedRow?.phone }}
        titleText="Tolak Verifikasi Admin"
        infoText="Kirim informasi penolakan ke admin. Pesan berikut masih bisa kamu edit sebelum dikirim."
        variant="danger"
      />

      {/* Reason viewer */}
      {showReasonPopup && reasonRow && (
        <div className={styles.popupOverlay} onClick={closeReason}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}>Alasan Penolakan</div>

            <div className={styles.reasonHeader}>
              <div><strong>Nama:</strong> {reasonRow.name || reasonRow.nama || '-'}</div>
              {'nip' in reasonRow && <div><strong>NIP:</strong> {reasonRow.nip || '-'}</div>}
              {'phone' in reasonRow && <div><strong>Phone:</strong> {reasonRow.phone || '-'}</div>}
              <div><strong>Email:</strong> {reasonRow.email || '-'}</div>
            </div>

            <label className={styles.label} style={{marginBottom: 6}}>Alasan</label>
            <div className={styles.reasonView}>
              {reasonRow.rejection_reason || '-'}
            </div>

            <div className={styles.popupActionRow}>
              <button className={styles.cancelBtn} type="button" onClick={closeReason}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== POPUP: EDIT AKSES ADMIN ===== */}
      {showEditAccessPopup && (
        <div className={styles.popupOverlay} onClick={() => setShowEditAccessPopup(false)}>
          <div className={styles.popupBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.popupTitle}>
              <FaEdit /> Edit Akses Admin
            </div>

            <div style={{ marginBottom: 10, color: '#41507a', fontSize: 14 }}>
              <div><strong>Admin:</strong> {selectedRow?.name || '-'}</div>
              <div><strong>Email:</strong> {selectedRow?.email || '-'}</div>
              <div style={{marginTop:6, fontSize:12, color:'#6a7bb8'}}>Maksimal {maxServices} layanan.</div>
            </div>

            {/* Daftar layanan dengan checkbox */}
            <form className={styles.popupForm} onSubmit={submitEditAccess}>
              {allServices.length === 0 ? (
                <div className={styles.centerMuted}>Daftar layanan kosong.</div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))', gap: 10 }}>
                  {allServices.map((s) => {
                    const checked = pickedServiceIds.includes(s.id);
                    const disable = !checked && pickedServiceIds.length >= maxServices;
                    return (
                      <label key={s.id} style={{ display:'flex', alignItems:'center', gap:8, opacity: disable ? 0.6 : 1 }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disable}
                          onChange={() => togglePickService(s.id)}
                        />
                        {s.name}
                      </label>
                    );
                  })}
                </div>
              )}

              <div className={styles.popupActionRow}>
                <button className={styles.saveBtn} type="submit" disabled={loading}>
                  <FaCheck /> Simpan
                </button>
                <button className={styles.cancelBtn} type="button" onClick={() => setShowEditAccessPopup(false)}>
                  <FaTimes /> Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className={styles.toastSuccess} role="status" aria-live="polite">
          <FaCheck style={{ marginRight: 6 }} />
          Update berhasil!
        </div>
      )}
    </div>
  );
}

export async function getServerSideProps(ctx) {
  const ns = getNsFromReq(ctx.req);
  const from = ctx.resolvedUrl || "/Admin/Pengaturan/hal-pengaturan";

  // 🔹 1. regex cek
  if (!ns || !NS_RE.test(ns)) {
    console.log("[SSR Pengaturan] ns invalid:", ns);
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  // 🔹 2. cek apakah ada cookie admin_session__{ns}
  const cookieName = `admin_session__${ns}`;
  const token = ctx.req.cookies?.[cookieName];
  if (!token) {
    console.log("[SSR Pengaturan] tidak ada cookie untuk", cookieName);
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  try {
    // 🔹 3. verify token
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
      { algorithms: ["HS256"], clockTolerance: 10 }
    );

    const roleStr = String(payload?.role || payload?.role_name || "").toLowerCase();
    const roleIdNum = Number(payload?.role_id ?? 0);

    const isSuper =
      roleIdNum === 1 ||
      roleStr === "super_admin" ||
      roleStr === "superadmin" ||
      roleStr === "super-admin";

    if (!isSuper) {
      console.log("[SSR Pengaturan] role bukan super admin → redirect");
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
          permanent: false,
        },
      };
    }

    console.log("[SSR Pengaturan] OK super admin → lolos");
    return {
      props: {
        initialAdminName: payload?.name || "Super Admin",
        initialRoleId: 1,
        ns,
      },
    };
  } catch (err) {
    console.error("[SSR Pengaturan] gagal verify:", err.message);
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }
}
