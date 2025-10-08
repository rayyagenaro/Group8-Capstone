import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './signin.module.css';
import { useRouter } from 'next/router';
import SuccessPopup from '@/components/SuccessPopup/SuccessPopup';
import { makeNs } from '@/lib/ns';


export default function SignIn() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showForgotPopup, setShowForgotPopup] = useState(false);
  const [loading, setLoading] = useState(false);



  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    if (!email.trim() || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      // tetap buat ns agar server bisa set cookie namespaced (user_session__{ns})
      const ns = makeNs();

      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, ns }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error || 'Login gagal.');
        setLoading(false);
        return;
      }

      setShowSuccess(true);

      // gunakan redirect dari server jika ada, kalau tidak pakai path final yang kamu mau
      const target =
        typeof data?.redirect === 'string'
          ? data.redirect
          : `/User/HalamanUtama/hal-utamauser?ns=${encodeURIComponent(ns)}`;

      // opsi: beri sedikit delay agar popup sukses sempat terlihat
      setTimeout(() => {
        router.replace(target);
      }, 600);
    } catch (err) {
      setError('Terjadi kesalahan saat login.');
      setLoading(false);
    }
}


  function handleForgotPassword(e) {
    e.preventDefault();
    setShowForgotPopup(true);
  }
  function handleCloseForgotPopup() {
    setShowForgotPopup(false);
  }
  function handleBack() {
    router.push('/Login/hal-login');
  }

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <Image
          src="/assets/Logo BI Putih.png"
          alt="Logo BI Putih"
          width={220}
          height={110}
          className={styles.logoOnly}
          priority
        />
        <div className={styles.menu}>
          <Link href="/Signin/hal-sign" className={styles.signIn}>Sign In</Link>
          <Link href="/SignUp/hal-signup" className={styles.signUp}>Sign Up</Link>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          {/* HEADER CARD */}
          <div className={styles.cardHeaderRowMod}>
            <button className={styles.backBtn} type="button" onClick={handleBack} aria-label="Kembali">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="14" cy="12" r="11" fill="#fff" />
                <path d="M15 5l-7 7 7 7" stroke="#2F4D8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <div className={styles.headerLogoWrapper}>
              <Image
                src="/assets/BI-One-Blue.svg"
                alt="Logo D'ONE"
                width={160}
                height={44}
                className={styles.cardBankLogo}
                priority
              />
            </div>
            <div className={styles.backBtnSpacer} />
          </div>

          <span className={styles.welcome}>Selamat Datang!</span>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            <label htmlFor="email" className={styles.inputLabel}>Email</label>
            <input
              id="email"
              type="email"
              placeholder="contoh@email.com"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password" className={styles.inputLabel}>Password</label>
            <div className={styles.passwordGroup}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="************"
                className={styles.input + ' ' + styles.inputWithIcon}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              {/* Tombol mata */}
              <button
                type="button"
                className={styles.eyeIcon}
                onClick={() => setShowPassword((s) => !s)}
                title={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
                aria-label={showPassword ? 'Sembunyikan Password' : 'Lihat Password'}
              >
                {showPassword ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M2 2L22 22" stroke="#777" strokeWidth="2" />
                    <path
                      d="M17.94 17.94C16.13 19.25 13.88 20 12 20C7 20 2.73 16.11 1 12C1.65 10.48 2.63 9.09 3.86 7.98M8.46 5.29C9.62 5.09 10.78 5 12 5C17 5 21.27 8.89 23 13C22.38 14.55 21.44 16 20.21 17.13"
                      stroke="#bbb"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z"
                      stroke="#bbb"
                      strokeWidth="2"
                    />
                    <circle cx="12" cy="12" r="3" stroke="#bbb" strokeWidth="2" />
                  </svg>
                )}
              </button>
            </div>

            {showSuccess && <SuccessPopup message="Login berhasil!" />}

            {showForgotPopup && (
              <div className={styles.popupOverlay} onClick={handleCloseForgotPopup}>
                <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
                  <div className={styles.popupIcon}>
                    <svg width="62" height="62" viewBox="0 0 70 70" style={{ filter: "drop-shadow(0 2px 8px rgba(255,200,0,0.12))" }}>
                      <circle cx="35" cy="35" r="30" fill="#FFE066" />
                      <text
                        x="35" y="44"
                        textAnchor="middle"
                        fontSize="34"
                        fontFamily="'Segoe UI', Arial, sans-serif"
                        fill="#fff"
                        fontWeight="bold"
                        dominantBaseline="middle"
                        style={{ filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.09))" }}
                      >?</text>
                    </svg>
                  </div>
                  <div className={styles.popupMsg}>
                    Jika anda melupakan password anda,<br />
                    silahkan hubungi admin dengan nomor berikut:<br />
                    <span style={{ color:'#184b8c', fontWeight:'bold', fontSize: '1.13em', letterSpacing: '1px', display:'block', marginTop:'4px' }}>
                      0812812812
                    </span>
                  </div>
                  <button className={styles.button} style={{ marginTop: 4 }} onClick={handleCloseForgotPopup}>
                    Tutup
                  </button>
                </div>
              </div>
            )}

            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                Ingat Saya
              </label>
              <span className={styles.forgotLink} style={{ cursor: 'pointer' }} onClick={handleForgotPassword}>
                Lupa Kata Sandi?
              </span>
            </div>

            {error && <div className={styles.errorMsgBlue}>{error}</div>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !email.trim() || !password}
              style={{
                opacity: loading || !email.trim() || !password ? 0.6 : 1,
                cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className={styles.registerArea}>
            Belum Terdaftar?
            <Link href="/SignUp/hal-signup" className={styles.registerLink}>Buat Akun</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
