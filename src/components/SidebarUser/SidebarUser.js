import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './SidebarUser.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaBars, FaTimes } from 'react-icons/fa';
import Hamburger from 'hamburger-react';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;

export default function SidebarUser({ onLogout }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

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
    { href: '/User/HalamanUtama/hal-utamauser', text: 'Beranda', icon: FaHome },
    { href: '/User/History/hal-history', text: 'History', icon: FaClipboardList },
    { href: '/User/EditProfile/hal-editprofile', text: 'Pengaturan', icon: FaCog },
  ];

  const handleNavigate = (href) => {
    router.push(withNs(href));
    setIsOpen(false);
  };

  const pathnameOnly = router.asPath.split('?')[0];

  return (
    <>
      {/* Header khusus mobile */}
      <header className={styles.mobileHeader}>
        <div className={styles.headerContent}>
          {/* 🔹 Hamburger kiri */}
          <Hamburger
            toggled={isOpen}
            toggle={setIsOpen}
            size={24}
            color="#2f4d8e"
            className={styles.toggleBtn}
          />

          {/* 🔹 Logo di tengah */}
          <Image
            src="/assets/BI-One-Blue.svg"
            alt="Bank Indonesia"
            width={120}
            height={40}
            priority
            className={styles.headerLogo}
          />
        </div>
      </header>

      {/* Overlay */}
      {isOpen && <div className={styles.overlay} onClick={() => setIsOpen(false)} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
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

        <nav className={styles.navMenu}>
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
