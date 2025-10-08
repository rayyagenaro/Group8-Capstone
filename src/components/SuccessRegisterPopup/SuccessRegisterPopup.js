import React, { useEffect } from 'react';
import styles from './SuccessRegisterPopup.module.css';
import { FaCheckCircle, FaTimes } from 'react-icons/fa';

export default function SuccessRegisterPopup({
  open,
  onClose,
  onConfirm,      // opsional: aksi lanjut (redirect ke login)
  autoCloseMs=0, // 0 = tidak auto close. Contoh 2500 untuk 2.5s
}) {
  useEffect(() => {
    if (!open || !autoCloseMs) return;
    const t = setTimeout(() => {
      onConfirm ? onConfirm() : onClose?.();
    }, autoCloseMs);
    return () => clearTimeout(t);
  }, [open, autoCloseMs, onClose, onConfirm]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true">
      <div className={styles.box}>
        <button className={styles.closeBtn} onClick={() => onClose?.()} aria-label="Tutup">
          <FaTimes />
        </button>
        <div className={styles.iconWrap}>
          <FaCheckCircle className={styles.icon} />
        </div>
        <div className={styles.title}>Registrasi Berhasil</div>
        <p className={styles.message}>
          Akun kamu berhasil dibuat dan <b>menunggu verifikasi admin</b>.
          <br/>Mohon tunggu sebentar ya.
        </p>
        <div className={styles.actions}>
          <button className={styles.okBtn} onClick={() => (onConfirm ? onConfirm() : onClose?.())}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
