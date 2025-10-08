// /src/views/halamanutama/halamanUtamaAdmin.js
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import styles from './halamanUtamaAdmin.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import ServicesCards from '@/components/ServiceCards/ServiceCards';
import { getNsFromReq } from '@/lib/ns-server';
import { parseCookieHeader, resolveAdmin } from '@/lib/resolve';
import { withNs, NS_RE } from '@/lib/ns';

/* ===================== Page ===================== */
export default function HalamanUtamaAdmin({
  initialAdminName = 'Admin',
  initialRoleId = null,
  initialAllowedServiceIds = null,
}) {
  const router = useRouter();

  // Ambil ns valid dari query
  const ns =
    typeof router.query.ns === 'string' && NS_RE.test(router.query.ns)
      ? router.query.ns
      : '';

  const [namaAdmin, setNamaAdmin] = useState(initialAdminName);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [roleId, setRoleId] = useState(initialRoleId);
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialAllowedServiceIds);
  const [loading, setLoading] = useState(initialRoleId == null);

  // Pilih sidebar sesuai role
  const Sidebar = useMemo(() => {
    if (roleId === 1) return SidebarAdmin;
    if (roleId === 2) return SidebarFitur;
    return null;
  }, [roleId]);

  /* ---------- Client guard + refresh ---------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady) return;

      if (!ns) {
        router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
        return;
      }

      try {
        const r = await fetch(withNs('/api/me?scope=admin', ns), { cache: 'no-store' });
        const d = await r.json();
        if (!alive) return;

        if (!d?.hasToken || !d?.payload) {
          router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setNamaAdmin(d.payload.name || initialAdminName);

        if (d.payload.roleNormalized === 'super_admin') {
          setRoleId(1);
          setAllowedServiceIds(null);
        } else if (d.payload.roleNormalized === 'admin_fitur') {
          setRoleId(2);
          setAllowedServiceIds(Array.isArray(d.payload.service_ids) ? d.payload.service_ids : []);
        } else {
          router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
          return;
        }

        setLoading(false);
      } catch {
        router.replace(`/Signin/hal-signAdmin?from=${encodeURIComponent(router.asPath)}`);
      }
    })();
    return () => {
      alive = false;
    };
  }, [router.isReady, router.asPath, ns, initialAdminName]);

  /* ---------- Logout per-namespace ---------- */
  const handleLogout = async () => {
    try {
      const nsQS = new URLSearchParams(location.search).get('ns');
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns: nsQS }),
      });
    } catch {}
    router.replace('/Signin/hal-signAdmin');
  };

  if (loading || !Sidebar) {
    return <div className={styles.loading}>Memuat…</div>;
  }

  return (
    <div className={styles.background}>
      <Sidebar onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.welcomeBox}>
          <h2 className={styles.greeting}>Selamat Datang, {namaAdmin}</h2>
          <div className={styles.roleBadge}>
            {roleId === 1 ? 'Super Admin' : 'Admin Fitur'}
          </div>

          <div className={styles.servicesBox}>
            <div className={styles.servicesTitle}>Pilih Fitur untuk Dikelola</div>
            <div className={styles.servicesDesc}>
              Lihat Antrian &amp; Pesanan Setiap Fitur BI.ONE. Semua Tautan di Bawah
              Akan Membawa Anda ke Halaman Administrasi Setiap Layanan.
            </div>
            <ServicesCards ns={ns} allowedServiceIds={allowedServiceIds} />
          </div>
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

/* ===================== SSR Guard ===================== */
export async function getServerSideProps(ctx) {
  // ✅ lazy import modul server-only
  const ns = getNsFromReq(ctx.req);
  const from = ctx.resolvedUrl || '/Admin/HalamanUtama/hal-utamaAdmin';

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

    if (!a?.hasToken || !a?.payload) {
      return {
        redirect: {
          destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
          permanent: false,
        },
      };
    }

    if (a.payload.roleNormalized === 'super_admin') {
      return {
        props: {
          initialAdminName: a.payload.name || 'Admin',
          initialRoleId: 1,
          initialAllowedServiceIds: null,
        },
      };
    }

    if (a.payload.roleNormalized === 'admin_fitur') {
      return {
        props: {
          initialAdminName: a.payload.name || 'Admin',
          initialRoleId: 2,
          initialAllowedServiceIds: Array.isArray(a.payload.service_ids) ? a.payload.service_ids : [],
        },
      };
    }

    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
        permanent: false,
      },
    };
  } catch {
    return {
      redirect: {
        destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(withNs(from, ns))}`,
        permanent: false,
      },
    };
  }
}

