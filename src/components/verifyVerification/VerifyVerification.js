import React, { useEffect, useState } from 'react';
import styles from './VerifyVerification.module.css';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';

export default function VerifyVerificationPopup({
  show,
  onClose,
  onSubmit,                 // (messageText, openWhatsApp:boolean) => void
  loading = false,
  user = {},               // { name, nip, email, phone }
  defaultMessage = '',     // optional override
  titleText = 'Verifikasi',
  infoText = 'Kirim informasi verifikasi. Pesan di bawah bisa kamu edit dulu sebelum dikirim.',
  variant = 'info',        // 'info' | 'danger'
}) {
  const [message, setMessage] = useState(defaultMessage || '');
  const [openWhatsApp, setOpenWhatsApp] = useState(true);

  useEffect(() => {
    if (!show) return;

    // fallback template bila defaultMessage tidak dikirim
    const preset =
      defaultMessage ||
      `Halo ${user?.name || ''},

Pengajuan akun BI-ONE Anda telah *TERVERIFIKASI* ✅

Detail:
• Nama : ${user?.name || '-'}
• NIP  : ${user?.nip || '-'}
• Email: ${user?.email || '-'}

Anda sudah dapat login dan menggunakan aplikasi.
Terima kasih.`;

    setMessage(preset);
    setOpenWhatsApp(true);
  }, [show, defaultMessage, user]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = (message || '').trim();
    if (!val) {
      alert('Silakan isi pesan.');
      return;
    }
    onSubmit(val, openWhatsApp);
  };

  const boxClass = `${styles.box} ${variant === 'danger' ? styles.danger : styles.info}`;
  const sendBtnClass = `${styles.sendBtn} ${variant === 'danger' ? styles.sendBtnDanger : styles.sendBtnSuccess}`;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={boxClass} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{titleText}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={18} />
          </button>
        </div>

        <p className={styles.info}>{infoText}</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Pesan WhatsApp</label>
          <textarea
            className={styles.textarea}
            rows={7}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tulis pesan…"
          />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={openWhatsApp}
              onChange={(e) => setOpenWhatsApp(e.target.checked)}
            />
            Buka WhatsApp setelah kirim
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={sendBtnClass} disabled={loading}>
              {loading ? 'Memproses…' : (<><FaWhatsapp style={{marginRight:6}}/> Kirim</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
