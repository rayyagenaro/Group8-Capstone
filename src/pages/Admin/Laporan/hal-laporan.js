// /src/pages/Admin/Laporan/hal-laporan.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import styles from './laporan.module.css';

import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader, resolveAdmin } from '@/lib/resolve';
import { NS_RE } from '@/lib/ns-server';

/* ====== PEMETAAN LAYANAN (sama spirit dengan halaman Persetujuan) ====== */
// Service ID dari payload token -> service key internal
const SERVICE_ID_MAP = {
  1: 'bidrive',
  2: 'bicare',
  3: 'bimeal',
  4: 'bimeet',
  6: 'bistay',
};

// Daftar modul yang tampil di dropdown + kunci service untuk filter role
const MODULES = [
  { value: 'bi-care',  label: 'CARE',  serviceKey: 'bicare'  },
  { value: 'bi-drive', label: 'DRIVE', serviceKey: 'bidrive' },
  { value: 'bi-meal',  label: 'MEAL',  serviceKey: 'bimeal'  },
  { value: 'bi-meet',  label: 'MEET',  serviceKey: 'bimeet'  },
  { value: 'bi-stay',  label: 'STAY',  serviceKey: 'bistay'  },
];

// Alias service key yang dianggap sama
const isAlias = (svcKey, compare) => {
  if (!svcKey || !compare) return false;
  if (svcKey === compare) return true;
};

// helper ns
function withNs(url, ns) {
  if (!ns) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}ns=${encodeURIComponent(ns)}`;
}
// build query string dari object (skip undefined/empty)
function qs(params) {
  const sp = new URLSearchParams();
  Object.entries(params || {}).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const sv = String(v).trim();
    if (sv === '') return;
    sp.append(k, sv);
  });
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// === utils tanggal ===
const pad = (n) => String(n).padStart(2, '0');
function fmtDateTimeLocal(v) {
  if (!v) return '';
  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const [h, m] = v.split(':');
    return `${h}:${m}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (isNaN(d)) return String(v);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function looksDateKey(k) {
  return /(date|time|datetime|created|updated|birth|tanggal)/i.test(k);
}

export default function HalLaporan({ initialRoleId = null, initialServiceIds = null }) {
  const router = useRouter();

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
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

  // ==== NS dari query/asPath ====
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // ==== Role & Allowed Services (SSR-first) ====
  const [roleId, setRoleId] = useState(initialRoleId);          // 1=super admin, 2=admin fitur
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialServiceIds); // null=super admin (semua modul)

  useEffect(() => {
    if (!router.isReady) return;

    // Super admin: null artinya semua modul, tidak perlu fetch
    if (allowedServiceIds === null) return;

    // Kalau sudah ada izin (length > 0), beres
    if (Array.isArray(allowedServiceIds) && allowedServiceIds.length > 0) return;

    let alive = true;
    (async () => {
      try {
        // Hydrate dari /api/me karena token SSR sering tak membawa service_ids
        const url = ns ? `/api/me?scope=admin&ns=${encodeURIComponent(ns)}` : '/api/me?scope=admin';
        const r = await fetch(url, { cache: 'no-store' });
        const d = await r.json();

        if (!alive) return;

        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);

        setRoleId(isSuper ? 1 : 2);

        if (isSuper) {
          setAllowedServiceIds(null); // semua modul
        } else {
          const raw = Array.isArray(d?.payload?.service_ids) ? d.payload.service_ids : [];
          const ids = raw
            .map(x => SERVICE_ID_MAP[x] || null)
            .filter(Boolean);
          setAllowedServiceIds(ids);
        }
      } catch {
        // biarkan kosong; UI akan tetap menampilkan pesan tidak ada modul
      }
    })();

    return () => { alive = false; };
  }, [router.isReady, ns, allowedServiceIds]);

  const [sbLoading, setSbLoading] = useState(initialRoleId == null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      try {
        const url = ns ? `/api/me?scope=admin&ns=${encodeURIComponent(ns)}` : '/api/me?scope=admin';
        const r = await fetch(url, { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;

        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);
        setRoleId(isSuper ? 1 : 2);

        if (isSuper) {
          setAllowedServiceIds(null); // semua modul
        } else {
          const ids = Array.isArray(d?.payload?.service_ids)
            ? d.payload.service_ids.map(x => SERVICE_ID_MAP[x] || null).filter(Boolean)
            : [];
          setAllowedServiceIds(ids);
        }
      } catch {
        // fallback aman: treat sebagai admin fitur tanpa akses modul
        setRoleId(2);
        setAllowedServiceIds([]);
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, ns, initialRoleId]);

  // ==== Filter modul berdasarkan layanan yang diizinkan =====
  const allowedModules = useMemo(() => {
    // Super admin => semua modul
    if (allowedServiceIds === null) return MODULES;
    // Admin fitur => hanya modul yang serviceKey-nya ada di allowedServiceIds (dengan alias)
    if (Array.isArray(allowedServiceIds) && allowedServiceIds.length) {
      return MODULES.filter(m =>
        allowedServiceIds.some(sid => isAlias(m.serviceKey, sid))
      );
    }
    // Tidak ada izin modul
    return [];
  }, [allowedServiceIds]);

  // ==== State data laporan ====
  // default pilih modul pertama yang diizinkan (kalau ada), kalau belum ada izin pakai bi-meet sementara (akan dikoreksi di effect berikut)
  const [moduleKey, setModuleKey] = useState(allowedModules[0]?.value || 'bi-meet');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [preview, setPreview] = useState({ columns: [], rows: [] });
  const [q, setQ] = useState('');

  // Jika izin modul berubah, pastikan moduleKey valid
  useEffect(() => {
    if (!allowedModules.length) return;
    const exists = allowedModules.some(m => m.value === moduleKey);
    if (!exists) {
      setModuleKey(allowedModules[0].value); // geser ke modul pertama yang diizinkan
    }
  }, [allowedModules, moduleKey]);

  // pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // ====== AUTO LOAD data saat filter berubah ======
  useEffect(() => {
    if (!router.isReady) return;
    if (allowedModules.length === 0 && allowedServiceIds !== null) {
      // admin fitur tanpa izin modul -> kosongkan preview
      setPreview({ columns: [], rows: [] });
      setErrMsg('Tidak ada modul yang diizinkan untuk role ini.');
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setErrMsg('');
    setCurrentPage(1);

    (async () => {
      try {
        const query = qs({ module: moduleKey, from: from || undefined, to: to || undefined });
        const url = withNs(`/api/admin/laporan/booking${query}`, ns);
        const res = await fetch(url, { cache: 'no-store', signal: ac.signal });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Gagal mengambil data');

        const rows = Array.isArray(data.rows)
          ? data.rows.map((r) => {
              const out = { ...r };
              Object.keys(out).forEach((k) => {
                if (out[k] == null) out[k] = '';
                else if (looksDateKey(k)) out[k] = fmtDateTimeLocal(out[k]);
                else if (typeof out[k] === 'string' && out[k].endsWith('.000Z')) out[k] = fmtDateTimeLocal(out[k]);
              });
              return out;
            })
          : [];

        rows.sort((a, b) => (Number(a?.id) || 0) - (Number(b?.id) || 0)); // default ID ASC
        setPreview({ columns: data.columns || [], rows });
      } catch (e) {
        if (e.name !== 'AbortError') {
          setPreview({ columns: [], rows: [] });
          setErrMsg(e?.message || 'Terjadi kesalahan');
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [router.isReady, moduleKey, from, to, ns, allowedModules.length, allowedServiceIds]);

  // ====== EKSPOR: Popup & aksi ======
  const [showExportPopup, setShowExportPopup] = useState(false);
  const [exportMode, setExportMode] = useState('range'); // 'range' | 'all'
  const [exportCount, setExportCount] = useState(null);  // jumlah baris
  const [countLoading, setCountLoading] = useState(false);

  function openExport(mode) {
    setExportMode(mode);
    if (mode === 'range') {
      setExportCount(Array.isArray(preview.rows) ? preview.rows.length : 0);
    } else {
      setExportCount(null);
    }
    setShowExportPopup(true);
  }

  async function calcAllCount() {
    try {
      setCountLoading(true);
      const url = withNs(`/api/admin/laporan/booking${qs({ module: moduleKey })}`, ns);
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Gagal menghitung jumlah');
      setExportCount(Array.isArray(data.rows) ? data.rows.length : 0);
    } catch (e) {
      alert(e?.message || 'Gagal menghitung jumlah baris.');
    } finally {
      setCountLoading(false);
    }
  }

  function proceedExport() {
    try {
      const base = '/api/export/laporan';
      const query = exportMode === 'all'
        ? qs({ module: moduleKey })
        : qs({ module: moduleKey, from: from || undefined, to: to || undefined });

      const url = withNs(`${base}${query}`, ns);
      const a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setShowExportPopup(false);
    } catch (e) {
      alert(e?.message || 'Gagal mengekspor');
    }
  }

  // ====== filter + paging ======
  const filteredRows = useMemo(() => {
    if (!q.trim()) return preview.rows;
    const s = q.toLowerCase();
    return preview.rows.filter((row) => Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(s)));
  }, [preview.rows, q]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const startIdx = (clampedPage - 1) * itemsPerPage;
  const endIdx = Math.min(startIdx + itemsPerPage, totalItems);
  const pageRows = filteredRows.slice(startIdx, endIdx);

  const statusCell = (value) => {
    if (!value) return '';
    const val = String(value).toLowerCase();
    let cls = styles.pillPending;
    if (/finish|verified|approved/.test(val)) cls = styles.pillVerified;
    else if (/reject|cancel/.test(val)) cls = styles.pillRejected;
    return <span className={`${styles.statusPill} ${cls}`}>{value}</span>;
  };
  const renderCell = (k, v) => {
    if (k === 'status' || k === 'status_name') return statusCell(v);
    if (looksDateKey(k)) return <span className={styles.dateCell}>{fmtDateTimeLocal(v)}</span>;
    return v || '';
  };

  const resultsText = totalItems ? `Results: ${startIdx + 1} - ${endIdx} of ${totalItems}` : '';
  useEffect(() => { setCurrentPage(1); }, [itemsPerPage, moduleKey]);

  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp onLogout={() => setShowLogoutPopup(true)} />}
      <main className={styles.mainContent}>
        <div className={styles.tableBox}>
          <div className={styles.tableTopRow}>
            <div className={styles.tableTitle}>Laporan Booking</div>
          </div>

          {/* Controls */}
          <div className={styles.controlsRow}>
            <div className={styles.controlGroup}>
              <label className={styles.label}>Layanan</label>
              <select
                className={styles.input}
                value={moduleKey}
                onChange={(e) => setModuleKey(e.target.value)}
                disabled={allowedModules.length === 0}
              >
                {allowedModules.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Dari</label>
              <input type="date" className={styles.input} value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Semua" />
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.label}>Sampai</label>
              <input type="date" className={styles.input} value={to} onChange={(e) => setTo(e.target.value)} placeholder="Semua" />
            </div>

            <div className={styles.actionsRight}>
              <button
                className={styles.exportBtn}
                onClick={() => openExport('range')}
                disabled={loading || !preview.rows.length || !from || !to || allowedModules.length === 0}
                title="Ekspor berdasarkan rentang tanggal"
              >
                Ekspor (Rentang)
              </button>
              
              <button
                className={styles.previewBtn}
                onClick={() => openExport('all')}
                disabled={loading || !preview.columns.length || allowedModules.length === 0}
                title="Ekspor semua data modul (abaikan tanggal)"
                style={{ marginLeft: 8 }}
              >
                Ekspor (Semua)
              </button>
            </div>
          </div>

          {/* Search */}
          <div className={styles.searchRow}>
            <input
              type="text"
              placeholder="Cari cepat di hasil…"
              className={styles.searchInput}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={allowedModules.length === 0}
            />
            <div className={styles.resultsText}>{resultsText}</div>
          </div>

          {/* Table */}
          <div className={styles.tableWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  {preview.columns.map((c) => (
                    <th key={c.key}>{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allowedModules.length === 0 && !loading && !errMsg && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length || 1}>
                      Tidak ada modul yang diizinkan untuk role ini.
                    </td>
                  </tr>
                )}
                {loading && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length || 1}>Memuat data…</td>
                  </tr>
                )}
                {!loading && errMsg && (
                  <tr>
                    <td className={styles.centerError} colSpan={preview.columns.length || 1}>{errMsg}</td>
                  </tr>
                )}
                {!loading && !errMsg && pageRows.length === 0 && allowedModules.length > 0 && (
                  <tr>
                    <td className={styles.centerMuted} colSpan={preview.columns.length || 1}>Tidak ada data.</td>
                  </tr>
                )}
                {!loading && !errMsg && pageRows.length > 0 && allowedModules.length > 0 && pageRows.map((row, idx) => (
                  <tr key={`${row.id}-${idx}`}>
                    {preview.columns.map((c) => (
                      <td key={c.key}>
                        {renderCell(c.key, row[c.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalItems > 0 && allowedModules.length > 0 && (
            <>
              <div className={styles.paginationControls}>
                <span className={styles.resultsText}>{resultsText}</span>
                <div>
                  <label htmlFor="itemsPerPage" className={styles.label}>Items per page:</label>
                  <select
                    id="itemsPerPage"
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className={styles.itemsPerPageDropdown}
                    aria-label="Items per page"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              <Pagination
                currentPage={Math.min(currentPage, totalPages)}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </main>

      {/* ===== POPUP KONFIRMASI EKSPOR ===== */}
      {showExportPopup && (
        <div
          style={{
            position:'fixed', inset:0, background:'rgba(0,0,0,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000
          }}
          onClick={() => setShowExportPopup(false)}
        >
          <div
            style={{
              background:'#fff', borderRadius:14, boxShadow:'0 12px 40px rgba(0,0,0,.15)',
              width:'min(520px, 92vw)', padding:'20px 20px 16px 20px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{fontSize:18, fontWeight:800, color:'#2F4D8E', marginBottom:8}}>
              Konfirmasi Ekspor Excel
            </div>

            <div style={{fontSize:14.5, color:'#334', lineHeight:1.5}}>
              <div><b>Modul:</b> {allowedModules.find(m => m.value === moduleKey)?.label || moduleKey}</div>

              {exportMode === 'range' ? (
                <>
                  <div><b>Mode:</b> Rentang Tanggal</div>
                  <div><b>Rentang:</b> {from || '—'} s/d {to || '—'}</div>
                  <div style={{marginTop:6}}>
                    <b>Jumlah baris (tanpa filter pencarian & pagination):</b> {exportCount ?? 0}
                  </div>
                </>
              ) : (
                <>
                  <div><b>Mode:</b> Semua Data</div>
                  <div style={{marginTop:6}}>
                    <b>Jumlah baris:</b>{' '}
                    {exportCount != null ? exportCount : <i>(belum dihitung)</i>}
                    {exportCount == null && (
                      <button
                        onClick={calcAllCount}
                        disabled={countLoading}
                        style={{
                          marginLeft:10, padding:'6px 10px', borderRadius:8, border:'1px solid #d9e1ff',
                          background:'#f5f8ff', color:'#2F4D8E', fontWeight:700, cursor:'pointer'
                        }}
                      >
                        {countLoading ? 'Menghitung…' : 'Hitung jumlah'}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <div style={{display:'flex', justifyContent:'flex-end', gap:10, marginTop:16}}>
              <button
                onClick={() => setShowExportPopup(false)}
                style={{
                  padding:'9px 16px', borderRadius:10, border:'1.5px solid #e6e8f2',
                  background:'#fff', color:'#2F4D8E', fontWeight:800, cursor:'pointer'
                }}
              >
                Batal
              </button>
              <button
                onClick={proceedExport}
                disabled={(exportMode === 'range' && (!from || !to)) || allowedModules.length === 0}
                style={{
                  padding:'9px 16px', borderRadius:10, border:'none',
                  background:'#2F4D8E', color:'#fff', fontWeight:800, cursor:'pointer',
                  opacity: (exportMode === 'range' && (!from || !to)) || allowedModules.length === 0 ? .6 : 1
                }}
                title={exportMode === 'range' && (!from || !to) ? 'Isi tanggal dulu' : 'Ekspor sekarang'}
              >
                Ekspor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Logout Popup ===== */} 
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}

// ====== SSR: validasi token + role → pass initialRoleId & initialServiceIds ======
export async function getServerSideProps(ctx) {
  const ns = getNsFromReq(ctx.req); // ambil ns valid dari header/cookie/query
  const from = ctx.resolvedUrl || '/Admin/Laporan/hal-laporan';

  if (!ns) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookies = parseCookieHeader(ctx.req.headers.cookie);

  try {
    const a = await resolveAdmin(ns, cookies);
    // a: { hasToken, payload: { roleNormalized, service_ids, ... } }

    if (!a?.hasToken || !a?.payload) {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(`${from}${from.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}`)}`,
          permanent: false,
        },
      };
    }

    if (a.payload.roleNormalized === 'super_admin') {
      return {
        props: {
          initialRoleId: 1,
          initialServiceIds: null, // super admin: semua modul
        },
      };
    }

    if (a.payload.roleNormalized === 'admin_fitur') {
      return {
        props: {
          initialRoleId: 2,
          initialServiceIds: Array.isArray(a.payload.service_ids) ? a.payload.service_ids : [],
        },
      };
    }

    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(`${from}${from.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}`)}`,
        permanent: false,
      },
    };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(`${from}${from.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}`)}`,
        permanent: false,
      },
    };
  }
}
