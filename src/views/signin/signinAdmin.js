import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/router';
import styles from './signinAdmin.module.css';
import SuccessPopup from '@/components/SuccessPopup/SuccessPopup';
import { makeNs } from '@/lib/ns';

export default function SignInAdmin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

async function handleSubmit(e) {
  e.preventDefault();

  if (!email.trim() || !password) {
    setError('Email dan password wajib diisi.');
    return;
  }

  setError('');
  setLoading(true);

  try {
    const ns = makeNs();
    console.log('[DEBUG] Submitting loginAdmin', { email, ns });

    if (!/^[A-Za-z0-9_-]{3,32}$/.test(ns)) {
      setError('Namespace (ns) tidak valid.');
      setLoading(false);
      return;
    }

    const res = await fetch('/api/loginAdmin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, ns }),
    });

    console.log('[DEBUG] Response status', res.status);

    let data = {};
    try {
      data = await res.json();
    } catch (jsonErr) {
      console.warn('[DEBUG] Gagal parse JSON:', jsonErr);
    }

    console.log('[DEBUG] Response JSON:', data);

    if (!res.ok) {
      setError(data?.error || `Login gagal (${res.status}).`);
      setLoading(false);
      return;
    }

    setShowSuccess(true);

    const target =
      typeof data?.redirect === 'string'
        ? data.redirect
        : `/Admin/HalamanUtama/hal-utamaAdmin?ns=${encodeURIComponent(ns)}`;

    console.log('[DEBUG] Redirect target:', target);

    setTimeout(() => {
      router.replace(target);
    }, 1200);
  } catch (err) {
    console.error('[DEBUG] Login Admin Error:', err);
    setError('Terjadi kesalahan saat login.');
  } finally {
    setLoading(false);
  }
}


  function handleBack() {
    // sertakan ns kalau ada
    const ns = makeNs();
    router.push(`/Login/hal-login?ns=${encodeURIComponent(ns)}`);
  }

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <Image
          src="/assets/Logo BI Putih.png"
          alt="D'ONE Logo Putih"
          width={100}
          height={40}
          className={styles.logoOnly}
          priority
        />
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          {/* ROW: Button kembali & Logo center */}
          <div className={styles.cardHeaderRowMod}>
            <button
              className={styles.backBtn}
              type="button"
              onClick={handleBack}
              aria-label="Kembali"
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <circle cx="14" cy="12" r="11" fill="#fff" />
                <path d="M15 5l-7 7 7 7" stroke="#2F4D8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.headerLogoWrapper}>
              <Image
                src="/assets/BI-One-Blue.svg"
                alt="Logo BI.ONE"
                width={160}
                height={44}
                className={styles.cardBankLogo}
                priority
              />
            </div>
            <div className={styles.backBtnSpacer} />
          </div>

          <div className={styles.subGreeting}>
            Selamat Datang
            <div className={styles.adminText}>Admin!</div>
          </div>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            <input
              id="email"
              type="email"
              placeholder="Masukkan Email Anda"
              className={styles.input}
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
              autoComplete="username"
              required
            />

            <div className={styles.passwordGroup}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                className={`${styles.input} ${styles.inputWithIcon}`}
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeIcon}
                onClick={() => setShowPassword(s => !s)}
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

            <div className={styles.optionsRow}>
              <label className={styles.checkboxLabel}>
                <input type="checkbox" className={styles.checkbox} />
                Ingat Saya
              </label>
            </div>

            {error && <div className={styles.errorMsgBlue}>{error}</div>}

            <button
              type="submit"
              className={styles.button}
              disabled={loading || !email.trim() || !password}
              style={{
                opacity: loading || !email.trim() || !password ? 0.6 : 1,
                cursor: loading || !email.trim() || !password ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          {showSuccess && <SuccessPopup message="Login berhasil!" />}
        </div>
      </div>
    </div>
  );
}
