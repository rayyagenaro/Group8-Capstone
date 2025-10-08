// components/SidebarAdmin/SidebarAdmin.js
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './SidebarAdmin.module.css';
import {
  FaHome,
  FaClipboardList,
  FaCog,
  FaSignOutAlt,
  FaUsers,
  FaBook,
  FaChartPie,
} from 'react-icons/fa';
import Hamburger from 'hamburger-react';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export default function SidebarAdmin({ onLogout }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Ambil ns
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const withNs = (href) => {
    if (!ns) return href;
    return href + (href.includes('?') ? '&' : '?') + 'ns=' + encodeURIComponent(ns);
  };

  const menuItems = [
    { href: '/Admin/HalamanUtama/hal-utamaAdmin',     text: 'Beranda',             icon: FaHome },
    // { href: '/Admin/Persetujuan/hal-persetujuan',     text: 'Persetujuan Booking', icon: FaClipboardList },
    // { href: '/Admin/Ketersediaan/hal-ketersediaan',   text: 'Ketersediaan',        icon: FaUsers },
    // { href: '/Admin/Monitor/hal-monitor',             text: 'Monitor',             icon: FaChartPie },
    // { href: '/Admin/Laporan/hal-laporan',             text: 'Laporan',             icon: FaBook },
    { href: '/Admin/Pengaturan/hal-pengaturan',       text: 'Pengaturan',          icon: FaCog },
  ];

  const pathnameOnly = router.asPath.split('?')[0];

  const handleNavigate = (href) => {
    router.push(withNs(href));
    setIsOpen(false);
  };

  // Kunci scroll body saat sidebar terbuka (mobile)
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  // Tutup drawer saat route berubah
  useEffect(() => {
    const handle = () => setIsOpen(false);
    router.events.on('routeChangeStart', handle);
    return () => router.events.off('routeChangeStart', handle);
  }, [router.events]);

  return (
    <>
      {/* Header khusus mobile */}
      <header className={styles.mobileHeader}>
        <div className={styles.headerContent}>
          <Hamburger
            toggled={isOpen}
            toggle={setIsOpen}
            size={24}
            color="#2f4d8e"
            rounded
            label="Buka menu"
          />
          <Image
            src="/assets/BI-One-Blue.svg"
            alt="Bank Indonesia"
            width={120}
            height={40}
            priority
            className={styles.headerLogo}
          />
          {/* Spacer kanan agar logo tetap center */}
          <div style={{ width: 24 }} />
        </div>
      </header>

      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`} aria-hidden={!isOpen}>
        <div className={styles.logoSidebar}>
          <Image
            src="/assets/BI-One-Blue.svg"
            alt="Bank Indonesia"
            width={160}
            height={160}
            className={styles.logoDone}
            priority
          />
        </div>

        <nav className={styles.navMenu} aria-label="Menu admin">
          <ul>
            {menuItems.map((item) => {
              const isActive = pathnameOnly.startsWith(item.href);
              return (
                <li
                  key={item.href}
                  className={`${styles.menuItem} ${isActive ? styles.active : ''}`}
                  onClick={() => handleNavigate(item.href)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNavigate(item.href)}
                  role="button"
                  tabIndex={0}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <item.icon className={styles.menuIcon} />
                  <span>{item.text}</span>
                </li>
              );
            })}
          </ul>
        </nav>

        <div
          className={styles.logout}
          onClick={() => onLogout?.(ns)}
          onKeyDown={(e) => e.key === 'Enter' && onLogout?.(ns)}
          role="button"
          tabIndex={0}
        >
          <FaSignOutAlt className={styles.logoutIcon} />
          Logout
        </div>
      </aside>
    </>
  );
}
