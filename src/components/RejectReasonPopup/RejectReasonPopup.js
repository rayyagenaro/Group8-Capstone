// /src/components/RejectReasonPopup/RejectReasonPopup.jsx
import React, { useEffect, useState } from 'react';
import styles from './RejectReasonPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function RejectReasonPopup({
  show,
  onClose,
  onNext,
  title = 'Alasan Penolakan',
  placeholder = '— (tuliskan alasan singkat & jelas di sini) —',
}) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (show) setReason('');
  }, [show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = (reason || '').trim();
    if (!val) {
      alert('Alasan penolakan wajib diisi.');
      return;
    }
    onNext(val);
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Alasan Penolakan</label>
          <textarea
            className={styles.textarea}
            rows={5}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={placeholder}
          />

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Batal
            </button>
            <button type="submit" className={styles.nextBtn}>
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
