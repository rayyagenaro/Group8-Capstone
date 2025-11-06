// /src/pages/Admin/Fitur/[slug]/hal-queue.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './hal-queue.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { verifyAuth } from '@/lib/auth';
import { NS_RE } from '@/lib/ns-server';
import { withNs } from '@/lib/ns';

const calculateDays = (start, end) => {
  if (!start || !end) return '';
  const d = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24));
  return `${d || 1} Hari`;
};

const META = {
  bidrive:  { title: "BI.DRIVE", logo: "/assets/D'MOVE.svg"  },
  bicare: { title: "BI.CARE",  logo: "/assets/D'CARE.svg" },
  bimeal: { title: "BI.MEAL",  logo: "/assets/D'MEAL.svg"  },
  bimeet: { title: "BI.MEET",  logo: "/assets/D'ROOM.svg"  },
  bimail: { title: "BI.DOCS",  logo: "/assets/D'TRACK.svg" },
  bistay: { title: "BI.STAY",  logo: "/assets/D'REST.svg"  },
};

function renderCardText(slug, row) {
  const fmtID = (v) => (v ? new Date(v).toLocaleString('id-ID') : '-');

  switch (slug) {
    case 'bidrive':
      return {
        title: `BI.DRIVE | ${row.tujuan || '-'}`,
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
        status: '',
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

export default function HalQueue({ initialAdminName = 'Admin', initialRoleId = null }) {
  const router = useRouter();
  const slug = String(router.query.slug || '').toLowerCase();

  // ns dari query/asPath
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = (router.asPath || '').split('?')[1];
    if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  // ==== pilih sidebar by role (SSR → client fallback) ====
  const [roleId, setRoleId] = useState(initialRoleId);
  const [sbLoading, setSbLoading] = useState(initialRoleId == null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      try {
        const r = await fetch(withNs('/api/me?scope=admin', ns), { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;

        const rl = Number(d?.payload?.role_id_num ?? d?.payload?.role_id ?? 0);
        const rs = String(d?.payload?.role || d?.payload?.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);
        setRoleId(isSuper ? 1 : 2);

        if (d?.payload?.name) setNamaAdmin(d.payload.name);
      } catch {
        setRoleId(2); // fallback aman
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, ns, initialRoleId]);

  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);
  const listTopRef = useRef(null);

  // fetch antrian
  useEffect(() => {
    let active = true;
    (async () => {
      if (!slug) return;
      try {
        setLoading(true); setErr('');
        const r = await fetch(`/api/admin/queue/${slug}?status=pending&page=1&perPage=200`, { cache: 'no-store' });
        if (!r.ok) throw new Error('Gagal memuat antrian');
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

  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  const buildDetailUrl = (row) => withNs(`/Admin/Fitur/${slug}/detail?id=${row.id}`, ns);
  const SidebarComp = roleId === 1 ? SidebarAdmin : SidebarFitur;

  return (
    <div className={styles.background}>
      {!sbLoading && <SidebarComp onLogout={() => setShowLogoutPopup(true)} />}

      <main className={styles.mainContent}>
        <div className={styles.greeting}>
          Selamat datang, {namaAdmin}
          <div className={styles.adminText}>{roleId === 1 ? 'Super Admin' : 'Admin'}</div>
        </div>

        <div className={styles.boxLayanan}>
          <div className={styles.headerRow}>
            <button type="button" className={styles.backBtn} onClick={() => router.back()}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Kembali
            </button>
            <div className={styles.titleLayanan}>LAYANAN MASUK • {meta.title}</div>
            <div aria-hidden="true" />
          </div>

          <div ref={listTopRef} />

          <div className={styles.cardList}>
            {loading ? (
              <p className={styles.loadingText}>Memuat layanan...</p>
            ) : err ? (
              <p className={styles.errorText}>Error: {err}</p>
            ) : pageItems.length === 0 ? (
              <p className={styles.emptyText}>Belum ada permintaan booking baru.</p>
            ) : (
              pageItems.map((row) => {
                const t = renderCardText(slug, row);
                const to = buildDetailUrl(row);
                return (
                  <div
                    key={row.id}
                    className={styles.cardLayanan}
                    onClick={() => router.push(to)}
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
                        <div className={`${styles.layananStatus} ${t.status === 'Pending' ? styles.layananStatusProcess : ''}`}>
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
    </div>
  );
}

/* ========= SSR guard (boleh role 1 & 2) ========= */
export async function getServerSideProps(ctx) {
  const { ns: raw } = ctx.query;
  const ns = Array.isArray(raw) ? raw[0] : raw;
  const nsValid = typeof ns === 'string' && NS_RE.test(ns) ? ns : null;
  const from = ctx.resolvedUrl || '/Admin/Fitur/[slug]/hal-queue';

  if (!nsValid) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  const cookieName = `admin_session_${nsValid}`;
  const token = ctx.req.cookies?.[cookieName] || null;
  if (!token) {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }

  try {

    const payload = await verifyAuth(ctx.req, ['super_admin', 'admin_fitur'], 'admin');

    const rId = Number(payload?.role_id ?? 0);
    const rStr = String(payload?.role || '').toLowerCase();
    const isSuper =
      rId === 1 || ['super_admin', 'superadmin', 'super-admin'].includes(rStr);
    const isFitur =
      rId === 2 ||
      ['admin_fitur', 'admin-fitur', 'admin'].includes(rStr);

    if (!isSuper && !isFitur) {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
          permanent: false,
        },
      };
    }

    return {
      props: {
        initialRoleId: isSuper ? 1 : 2,
        initialAdminName: payload?.name || 'Admin',
      },
    };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`,
        permanent: false,
      },
    };
  }
}
