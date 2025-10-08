import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './SidebarFitur.module.css';
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaBook,
  FaChartPie,
  FaCog,        // disiapkan kalau nanti dipakai
  FaSignOutAlt,
} from 'react-icons/fa';
import Hamburger from 'hamburger-react';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export default function SidebarFitur({ onLogout }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  // Ambil ns dari query/asPath
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const withNs = (href) =>
    ns ? href + (href.includes('?') ? '&' : '?') + 'ns=' + encodeURIComponent(ns) : href;

  const menuItems = [
    { href: '/Admin/HalamanUtama/hal-utamaAdmin', text: 'Beranda',             icon: FaHome },
    { href: '/Admin/Persetujuan/hal-persetujuan', text: 'Persetujuan Booking', icon: FaClipboardList },
    { href: '/Admin/Ketersediaan/hal-ketersediaan', text: 'Ketersediaan',      icon: FaUsers },
    { href: '/Admin/Monitor/hal-monitor',         text: 'Monitor',             icon: FaChartPie },
    { href: '/Admin/Laporan/hal-laporan',         text: 'Laporan',             icon: FaBook },
  ];

  const pathnameOnly = router.asPath.split('?')[0];

  const handleNavigate = (href) => {
    router.push(withNs(href));
    setIsOpen(false);
  };

  // Kunci scroll body saat drawer terbuka (mobile)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // Tutup saat route berubah
  useEffect(() => {
    const handle = () => setIsOpen(false);
    router.events.on('routeChangeStart', handle);
    return () => router.events.off('routeChangeStart', handle);
  }, [router.events]);

  return (
    <>
      {/* Header mobile */}
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
          <div style={{ width: 24 }} />
        </div>
      </header>

      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

      {/* Drawer / Sidebar */}
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

        <nav className={styles.navMenu} aria-label="Menu admin fitur">
          <ul>
            {menuItems.map((item) => {
              const isActive = pathnameOnly.startsWith(item.href);
              const Icon = item.icon;
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
                  <Icon className={styles.menuIcon} />
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
