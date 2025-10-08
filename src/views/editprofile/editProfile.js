import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './editProfile.module.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';

const NS_RE = /^[A-Za-z0-9_-]{3,32}$/;
const withNs = (url, ns) => (ns ? `${url}${url.includes('?') ? '&' : '?'}ns=${encodeURIComponent(ns)}` : url);

export default function EditProfile() {
  const [showSuccess, setShowSuccess] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const router = useRouter();
  const nsFromQuery = typeof router.query.ns === 'string' ? router.query.ns : '';
  const nsFromAsPath = (() => {
    const q = router.asPath.split('?')[1];
    if (!q) return '';
    const params = new URLSearchParams(q);
    const v = params.get('ns') || '';
    return NS_RE.test(v) ? v : '';
  })();
  const ns = NS_RE.test(nsFromQuery) ? nsFromQuery : nsFromAsPath;

  const [profile, setProfile] = useState({
    email: '',
    name: '',
    hp: ''
  });

  useEffect(() => {
    // 1) seed dari localStorage dulu biar form langsung terisi
    try {
      const ls = JSON.parse(localStorage.getItem('user') || '{}');
      setProfile(prev => ({
        email: ls.email ?? prev.email ?? '',
        name:  ls.name  ?? prev.name  ?? '',
        hp:    (ls.phone ?? ls.hp ?? prev.hp ?? '') + '',
      }));
    } catch {}

    // 2) override dari /api/me
    (async () => {
      try {
        const res = await fetch('/api/me?scope=user', { cache: 'no-store', credentials: 'include' });
        const data = await res.json().catch(() => ({}));
        const p = data?.hasToken ? (data.payload ?? {}) : {};

        const email = p.email ?? '';
        const name  = p.name  ?? '';
        const hp    = (p.phone ?? p.hp ?? p.no_hp ?? p.telepon ?? '') + '';

        if (email || name || hp) {
          setProfile({ email, name, hp });
          // sinkronkan LS
          const prev = JSON.parse(localStorage.getItem('user') || '{}');
          localStorage.setItem('user', JSON.stringify({ ...prev, email, name, phone: hp }));
        }
      } catch {
        // diamkan; sudah ada seed dari LS
      }
    })();
  }, []);

  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  function closeSuccess() {
    setShowSuccess(false);
    router.push("/User/HalamanUtama/hal-utamauser");
  }

  function validate() {
    const err = {};
    if (!profile.email?.trim()) err.email = 'Email tidak ditemukan. Silakan login ulang.';
    if (!profile.name?.trim())  err.name  = 'Nama wajib diisi';
    if (!profile.hp?.trim())    err.hp    = 'No Handphone wajib diisi';
    return err;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const err = validate();
    setErrors(err);
    setSubmitted(true);
    if (Object.keys(err).length) return;

    // normalisasi hp (hapus spasi/tanda)
    const hpNorm = (profile.hp || '').replace(/[^\d+]/g, '');

    const payload = {
      email: profile.email.trim(),
      name:  profile.name.trim(),
      hp:    hpNorm,               // <-- server baca "hp", bukan "phone"
    };

    try {
      const res = await fetch('/api/updateProfile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `Gagal (HTTP ${res.status})`;
        try {
          const ct = res.headers.get('content-type') || '';
          msg = ct.includes('json') ? (await res.json())?.error || msg : await res.text() || msg;
        } catch {}
        throw new Error(msg);
      }

      setShowSuccess(true);

      // sinkronkan LS
      const prev = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...prev, name: payload.name, phone: payload.hp }));
    } catch (error) {
      console.error('Update profile error:', error);
      alert(error.message || 'Terjadi kesalahan saat mengupdate profil');
    }
  };

  // Fungsi Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'user', ns }),   // <-- user
      });
    } catch {}
    router.replace('/Signin/hal-sign');               // <-- signin user
  };

  return (
    <div className={styles.background}>
      {/* Sidebar */}
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          <div className={styles.topRow}>
            <button className={styles.backBtn} onClick={() => router.back()} type="button">
              <FaArrowLeft /> 
            </button>
            <div className={styles.title}>
              Edit Profile
            </div>
          </div>

          <form className={styles.profileForm} autoComplete="off" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="email">EMAIL</label>
              <input
                className={styles.input}
                type="text"
                name="email"
                id="email"
                value={profile.email}
                disabled
                readOnly
                style={{ background: '#f5f5f5', color: '#888' }}
              />
              {submitted && errors.email && <span className={styles.errorMsg}>{errors.email}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="name">Nama Lengkap</label>
              <input
                className={styles.input}
                type="text"
                name="name"
                id="name"
                value={profile.name}
                onChange={handleChange}
              />
              {submitted && errors.name && <span className={styles.errorMsg}>{errors.name}</span>}
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="hp">No Handphone</label>
              <input
                className={styles.input}
                type="text"
                name="hp"
                id="hp"
                value={profile.hp}
                onChange={handleChange}
              />
              {submitted && errors.hp && <span className={styles.errorMsg}>{errors.hp}</span>}
            </div>
            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.saveBtn}>Update</button>
            </div>
            {showSuccess && (
              <div className={styles.popupOverlay}>
                <div className={styles.popupBox}>
                  <button className={styles.popupClose} onClick={closeSuccess} title="Tutup">&times;</button>
                  <div className={styles.popupIcon}>
                    <svg width="70" height="70" viewBox="0 0 70 70">
                      <circle cx="35" cy="35" r="35" fill="#7EDC89" />
                      <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className={styles.popupMsg}><b>Data berhasil diupdate!</b></div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
      {/* Popup Logout */}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
