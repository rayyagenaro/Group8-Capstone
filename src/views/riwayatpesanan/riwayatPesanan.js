import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './riwayatPesanan.module.css';
import { FaHome, FaClipboardList, FaHistory, FaCog, FaSignOutAlt, FaCheckCircle, FaTimesCircle, FaArrowLeft, FaSearch } from 'react-icons/fa';

export default function RiwayatPesanan() {
  // Data dummy riwayat pesanan
  const dataPesanan = [
    {
      id: 1,
      logo: "/assets/D'REST.png",
      title: "Booking D'REST – Bandung",
      hari: "3 Hari",
      status: "Selesai",
    },
    {
      id: 2,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE – Semarang",
      hari: "7 Hari",
      status: "Selesai",
    },
    {
      id: 3,
      logo: "/assets/D'MOVE.png",
      title: "Booking D'MOVE – Surabaya",
      hari: "2 Hari",
      status: "Selesai",
    },
    {
      id: 4,
      logo: "/assets/D'REST.png",
      title: "Booking D'REST – Trawas",
      hari: "3 Hari",
      status: "Ditolak",
    },
  ];

  const [search, setSearch] = useState('');

  // Filter pencarian
  const filteredPesanan = dataPesanan.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className={styles.background}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logoSidebar}>
          <Image
            src="/assets/BI_Logo.png"
            alt="Bank Indonesia"
            width={110}
            height={36}
            className={styles.logoDone}
            priority
          />
        </div>
        <nav className={styles.navMenu}>
          <ul>
            <li>
              <FaHome className={styles.menuIcon} />
              <Link href='/HalamanUtama/hal-utamauser'>Beranda</Link>
            </li>
            <li>
              <FaClipboardList className={styles.menuIcon} />
              <Link href='/StatusBooking/hal-statusBooking'>Status Booking</Link>
            </li>
            <li className={styles.active}>
              <FaHistory className={styles.menuIcon} />
              <Link href='/RiwayatPesanan/hal-riwayatPesanan'>Riwayat Pesanan</Link>
            </li>
            <li>
              <FaCog className={styles.menuIcon} />
              <Link href='/EditProfile/hal-editprofile'>Pengaturan</Link>
            </li>
          </ul>
        </nav>
        <div className={styles.logout}>
          <Link href="/Login/hal-login" passHref legacyBehavior>
            <FaSignOutAlt className={styles.logoutIcon} />
          </Link>
          Logout
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className={styles.mainContent}>
        {/* HEADER */}
        <div className={styles.header}>
          <div className={styles.logoBIWrapper}>
            <Image
              src="/assets/D'ONE.png"
              alt="D'ONE"
              width={170}
              height={34}
              className={styles.logoBI}
              priority
            />
          </div>
          <form className={styles.searchBar} onSubmit={e => e.preventDefault()}>
            <input type="text" placeholder="Search" />
            <button type="submit">
              <FaSearch size={18} color="#2F4D8E" />
            </button>
          </form>
        </div>
        {/* TITLE ROW */}
        <div className={styles.titleRow}>
          <button className={styles.backBtn}><FaArrowLeft /> <Link href="/HalamanUtama/hal-utamauser" passHref legacyBehavior>Kembali</Link></button>
          <div className={styles.pageTitle}>RIWAYAT PESANAN</div>
        </div>
        {/* BOX RIWAYAT */}
        <div className={styles.boxRiwayat}>
          {/* SEARCH BAR BESAR */}
          <div className={styles.searchRiwayat}>
            <FaSearch size={18} color="#6c6c80" className={styles.searchIcon} />
            <input
              className={styles.inputCari}
              type="text"
              placeholder="Cari riwayat pemesanan."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* LIST RIWAYAT */}
          <div className={styles.riwayatList}>
            {filteredPesanan.length === 0 && (
              <div className={styles.noResult}>Data tidak ditemukan.</div>
            )}
            {filteredPesanan.map(item => (
              <div key={item.id} className={styles.riwayatCard}>
                <Image
                  src={item.logo}
                  alt={item.title}
                  width={55}
                  height={55}
                  className={styles.riwayatLogo}
                  priority
                />
                <div className={styles.riwayatContent}>
                  <div className={styles.riwayatTitle}>{item.title}</div>
                  <div className={styles.riwayatHari}>{item.hari}</div>
                  <div className={
                    item.status === 'Selesai'
                      ? styles.statusSelesai
                      : styles.statusDitolak
                  }>
                    {item.status === 'Selesai' ? (
                      <>
                        <FaCheckCircle style={{ color: '#22a455', marginRight: 6 }} />
                        Selesai
                      </>
                    ) : (
                      <>
                        <FaTimesCircle style={{ color: '#ed6257', marginRight: 6 }} />
                        Ditolak
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}