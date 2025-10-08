import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './signup.module.css';

export default function Signup() {
  const router = useRouter();

  const [fields, setFields] = useState({
    nama: '',
    nip: '',
    hp: '',
    email: '',
    password: '',
    konfirmasi: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // NEW: loading saat submit & popup sukses
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // OPTIONAL: auto-redirect setelah beberapa detik saat popup muncul
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => {
      router.replace('/Signin/hal-sign');
    }, 2500); // 2.5 detik
    return () => clearTimeout(t);
  }, [showSuccess, router]);

  // Validasi wajib isi & password sama
  function validate() {
    const e = {};
    if (!fields.nama) e.nama = "Nama wajib diisi";
    if (!fields.nip) e.nip = "NIP wajib diisi";
    if (!fields.hp) e.hp = "No HP wajib diisi";
    if (!fields.email) e.email = "Email wajib diisi";
    if (!fields.password) e.password = "Kata sandi wajib diisi";
    if (!fields.konfirmasi) e.konfirmasi = "Konfirmasi kata sandi wajib diisi";
    if (fields.password && fields.konfirmasi && fields.password !== fields.konfirmasi) {
      e.konfirmasi = "Konfirmasi tidak sama";
    }
    return e;
  }

  function handleChange(e) {
    setFields({ ...fields, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: undefined });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);

    if (Object.keys(err).length === 0) {
      try {
        setLoading(true);
        const res = await fetch('/api/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nama: fields.nama,
            nip: fields.nip,
            hp: fields.hp,
            email: fields.email,
            password: fields.password,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          // Tampilkan popup sukses + pesan menunggu verifikasi
          setShowSuccess(true);
          // NOTE: redirect ditangani di useEffect (auto), atau tombol OK di popup di bawah
        } else {
          alert(data.error || 'Terjadi kesalahan saat mendaftar');
        }
      } catch (err) {
        console.error('Error:', err);
        alert('Gagal terhubung ke server');
      } finally {
        setLoading(false);
      }
    }
  }

  const bolehDaftar = Object.values(fields).every(x => !!x) && fields.password === fields.konfirmasi;

  function handleBack() {
    // sama seperti halaman lain: balik ke halaman login umum
    router.push('/Login/hal-login');
  }

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/Logo BI Putih.png"
            alt="Logo BI Putih"
            width={75}
            height={40}
            className={styles.logoDone}
            priority
          />
        </div>
        <div className={styles.menu}>
          <Link href="/Signin/hal-sign" className={styles.signIn}>Sign In</Link>
          <Link href="/SignUp/hal-signup" className={styles.signUp}>Sign Up</Link>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          {/* HEADER CARD: logo center, tombol back menempel kiri */}
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
                alt="Logo D'ONE"
                width={120}
                height={34}
                className={styles.logoBI}
                priority
              />
            </div>
          </div>

          <div className={styles.cardTitle}>Register Akun</div>
          <div className={styles.cardSubtitle}>Isi data di bawah ini dengan sesuai!</div>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            {/* Nama */}
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nama"
                type="text"
                placeholder="Nama Lengkap"
                value={fields.nama}
                onChange={handleChange}
              />
              {submitted && errors.nama && <div className={styles.errorMsg}>{errors.nama}</div>}
            </div>

            {/* NIP */}
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nip"
                type="text"
                placeholder="NIP"
                value={fields.nip}
                onChange={handleChange}
              />
              {submitted && errors.nip && <div className={styles.errorMsg}>{errors.nip}</div>}
            </div>

            {/* HP */}
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="hp"
                type="text"
                placeholder="Nomor Handphone"
                value={fields.hp}
                onChange={handleChange}
              />
              {submitted && errors.hp && <div className={styles.errorMsg}>{errors.hp}</div>}
            </div>

            {/* Email */}
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="email"
                type="email"
                placeholder="Email"
                value={fields.email}
                onChange={handleChange}
              />
              {submitted && errors.email && <div className={styles.errorMsg}>{errors.email}</div>}
            </div>

            {/* Password */}
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <input
                className={styles.input}
                name="password"
                type={showPass ? "text" : "password"}
                placeholder="Kata Sandi"
                value={fields.password}
                onChange={handleChange}
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowPass(x => !x)}
                tabIndex={0}
                aria-label="Toggle password"
              />
              {submitted && errors.password && <div className={styles.errorMsg}>{errors.password}</div>}
            </div>

            {/* Konfirmasi */}
            <div className={styles.formGroup} style={{ position: "relative" }}>
              <input
                className={styles.input}
                name="konfirmasi"
                type={showConf ? "text" : "password"}
                placeholder="Konfirmasi Kata Sandi"
                value={fields.konfirmasi}
                onChange={handleChange}
              />
              <span
                className={styles.eyeIcon}
                onClick={() => setShowConf(x => !x)}
                tabIndex={0}
                aria-label="Toggle confirm password"
              />
              {submitted && errors.konfirmasi && <div className={styles.errorMsg}>{errors.konfirmasi}</div>}
            </div>

            {/* Tombol Daftar */}
            <button
              type="submit"
              className={styles.button}
              disabled={!bolehDaftar || loading}
              style={{
                opacity: (!bolehDaftar || loading) ? 0.5 : 1,
                cursor: (!bolehDaftar || loading) ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Memproses…' : 'Daftar'}
            </button>
          </form>

          {/* POPUP SUKSES */}
          {showSuccess && (
            <div className={styles.popupOverlay} role="dialog" aria-modal="true">
              <div className={styles.popupBox}>
                <button
                  className={styles.popupCloseBtn}
                  onClick={() => router.replace('/Signin/hal-sign')}
                  aria-label="Tutup"
                >
                  ×
                </button>

                <div className={styles.popupIcon}>
                  <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true">
                    <circle cx="35" cy="35" r="35" fill="#7EDC89" />
                    <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                <div className={styles.popupTitle}>Registrasi Berhasil</div>
                <div className={styles.popupMsg}>
                  Akun kamu berhasil dibuat dan <b>menunggu verifikasi admin</b>.<br />
                  Mohon tunggu sebentar ya.
                </div>

                <div className={styles.popupActions}>
                  <button
                    className={styles.okBtn}
                    onClick={() => router.replace('/Signin/hal-sign')}
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.registerArea}>
            Punya Akun? <Link href="/Signin/hal-sign" className={styles.registerLink}>Masuk ke Akunmu</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
