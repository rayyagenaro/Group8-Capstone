// /src/pages/views/signup/signupAdmin.js
import React, { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './signupAdmin.module.css';

function validPhone(v) {
  if (!v) return false;
  const s = String(v).replace(/[^\d+]/g, '');
  return /^(?:\+?62|0)\d{7,13}$/.test(s);
}
function getEmailDomain(email = '') {
  const at = String(email).toLowerCase().trim().split('@');
  return at.length === 2 ? at[1] : '';
}

export default function SignupAdmin() {
  const router = useRouter();

  const [fields, setFields] = useState({
    nama: '',
    email: '',
    phone: '',
    password: '',
    konfirmasi: '',
  });

  const [services, setServices] = useState([]);
  const [selectedServices, setSelectedServices] = useState([]);
  const [showPass, setShowPass] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Ambil daftar layanan
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch('/api/admin/admin-services', { cache: 'no-store' });
        if (!active) return;
        if (r.ok) {
          const data = await r.json();
          setServices(Array.isArray(data) ? data : []);
        } else {
          setServices([]);
        }
      } catch {
        setServices([]);
      }
    })();
    return () => { active = false; };
  }, []);

  const maxAllowed = useMemo(() => {
    return getEmailDomain(fields.email) === 'umi.com' ? 4 : 2;
  }, [fields.email]);

  // Jika kuota turun (ubah email), pangkas seleksi
  useEffect(() => {
    if (selectedServices.length > maxAllowed) {
      setSelectedServices((arr) => arr.slice(0, maxAllowed));
    }
  }, [maxAllowed, selectedServices.length]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFields(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  function toggleService(id) {
    setSelectedServices(prev => {
      const exists = prev.includes(id);
      if (exists) return prev.filter(x => x !== id);
      if (prev.length >= maxAllowed) return prev; // lock jika sudah max
      return [...prev, id];
    });
  }

  function validate() {
    const e = {};
    if (!fields.nama) e.nama = 'Nama wajib diisi';
    if (!fields.email) e.email = 'Email wajib diisi';
    if (!fields.phone) e.phone = 'No HP wajib diisi';
    else if (!validPhone(fields.phone)) e.phone = 'Format no HP tidak valid (08xx / 62xx)';
    if (!fields.password) e.password = 'Kata sandi wajib diisi';
    if (!fields.konfirmasi) e.konfirmasi = 'Konfirmasi wajib diisi';
    if (fields.password && fields.konfirmasi && fields.password !== fields.konfirmasi) {
      e.konfirmasi = 'Konfirmasi tidak cocok';
    }
    if (selectedServices.length < 1) e.services = 'Pilih minimal 1 layanan';
    if (selectedServices.length > maxAllowed) e.services = `Maksimal ${maxAllowed} layanan untuk domain ini`;
    return e;
  }

  const bolehDaftar =
    fields.nama &&
    fields.email &&
    fields.phone && validPhone(fields.phone) &&
    fields.password &&
    fields.konfirmasi &&
    fields.password === fields.konfirmasi &&
    selectedServices.length >= 1 &&
    selectedServices.length <= maxAllowed;

  async function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    setErrors(err);
    setSubmitted(true);

    if (Object.keys(err).length === 0) {
      try {
        const payload = {
          nama: fields.nama,
          email: fields.email,
          phone: fields.phone,
          password: fields.password,
          role_id: 2, // Admin Fitur
          service_ids: [...new Set(selectedServices)],
        };

        const res = await fetch('/api/registerAdmin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (res.ok) {
          setShowSuccess(true);
          setTimeout(() => router.replace('/Signin/hal-signAdmin'), 1500);
        } else {
          alert(data.error || 'Terjadi kesalahan saat mendaftar admin');
        }
      } catch {
        alert('Gagal menghubungi server');
      }
    }
  }

  function handleBack() {
    router.push('/Login/hal-login');
  }

  return (
    <div className={styles.background}>
      {/* TOPBAR */}
      <div className={styles.topbar}>
        <div className={styles.logoWrap}>
          <Image
            src="/assets/Logo BI Putih.png"
            alt="Bank Indonesia Logo"
            width={180}
            height={50}
            priority
          />
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <div className={styles.card}>
          {/* HEADER */}
          <div className={styles.cardHeaderRowMod}>
            <button className={styles.backBtn} type="button" onClick={handleBack} aria-label="Kembali">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <circle cx="14" cy="12" r="11" fill="#fff" />
                <path d="M15 5l-7 7 7 7" stroke="#2F4D8E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className={styles.headerLogoWrapper}>
              <Image src="/assets/BI-One-Blue.png" alt="BI One Logo" width={180} height={60} priority />
            </div>
          </div>

          <div className={styles.cardTitle}>Registrasi Admin Layanan</div>
          <div className={styles.cardSubtitle}>
            Buat akun admin untuk layanan tertentu. Pendaftaran akan <b>diverifikasi Super Admin</b> terlebih dulu.
          </div>

          <form className={styles.form} autoComplete="off" onSubmit={handleSubmit}>
            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="nama"
                type="text"
                placeholder="Nama Admin"
                value={fields.nama}
                onChange={handleChange}
              />
              {submitted && errors.nama && <div className={styles.errorMsg}>{errors.nama}</div>}
            </div>

            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="email"
                type="email"
                placeholder="Email Admin"
                value={fields.email}
                onChange={handleChange}
              />
              {submitted && errors.email && <div className={styles.errorMsg}>{errors.email}</div>}
            </div>

            <div className={styles.formGroup}>
              <input
                className={styles.input}
                name="phone"
                type="text"
                placeholder="No HP (08xxx / 62xxx)"
                value={fields.phone}
                onChange={handleChange}
              />
              {submitted && errors.phone && <div className={styles.errorMsg}>{errors.phone}</div>}
            </div>

            {/* SERVICES: kuota dinamis */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className={styles.mutedText}>Pilih Layanan (maks {maxAllowed})</label>
                <span className={styles.badgeSmall} aria-live="polite">
                  {selectedServices.length}/{maxAllowed} dipilih
                </span>
              </div>

              <div className={styles.checkboxGrid} role="group" aria-label="Pilih layanan">
                {services.length === 0 ? (
                  <div className={styles.mutedText}>Daftar layanan kosong / gagal diambil</div>
                ) : (
                  services.map((s) => {
                    const id = s.id;
                    const checked = selectedServices.includes(id);
                    const disabled = !checked && selectedServices.length >= maxAllowed;
                    return (
                      <label
                        key={id}
                        className={[
                          styles.checkboxItem,
                          checked ? styles.checked : '',
                          disabled ? styles.disabled : '',
                        ].join(' ')}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleService(id)}
                        />
                        <span>{s.name}</span>
                      </label>
                    );
                  })
                )}
              </div>

              {submitted && errors.services && (
                <div className={styles.errorMsg}>{errors.services}</div>
              )}
            </div>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <input
                className={styles.input}
                name="password"
                type={showPass ? 'text' : 'password'}
                placeholder="Kata Sandi"
                value={fields.password}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowPass((s) => !s)} />
              {submitted && errors.password && <div className={styles.errorMsg}>{errors.password}</div>}
            </div>

            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <input
                className={styles.input}
                name="konfirmasi"
                type={showConf ? 'text' : 'password'}
                placeholder="Konfirmasi Kata Sandi"
                value={fields.konfirmasi}
                onChange={handleChange}
              />
              <span className={styles.eyeIcon} onClick={() => setShowConf((s) => !s)} />
              {submitted && errors.konfirmasi && <div className={styles.errorMsg}>{errors.konfirmasi}</div>}
            </div>

            <button
              type="submit"
              className={styles.button}
              disabled={!bolehDaftar}
              style={{ opacity: bolehDaftar ? 1 : 0.5, cursor: bolehDaftar ? 'pointer' : 'not-allowed' }}
            >
              Daftar Admin
            </button>
          </form>

          {showSuccess && (
            <div className={styles.popupOverlay}>
              <div className={styles.popupBox}>
                <div className={styles.popupIcon}>
                  <svg width="70" height="70" viewBox="0 0 70 70">
                    <circle cx="35" cy="35" r="35" fill="#7EDC89" />
                    <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className={styles.popupMsg}>
                  <b>Pengajuan diterima.</b><br />
                  Akun Anda <b>menunggu verifikasi</b> oleh Super Admin.
                </div>
              </div>
            </div>
          )}

          <div className={styles.registerArea}>
            Sudah punya akun admin?
            <Link href="/Signin/hal-signAdmin" className={styles.registerLink}>Masuk di sini</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
