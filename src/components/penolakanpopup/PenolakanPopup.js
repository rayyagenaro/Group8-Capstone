import React, { useEffect, useState } from 'react';
import styles from './penolakanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PenolakanPopup({ show, onClose, onSubmit, loading = false }) {
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (show) setReason('');
  }, [show]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const val = reason.trim();
    if (!val) {
      alert('Silakan isi alasan penolakan');
      return;
    }
    onSubmit(val);
  };

  return (
    <div className={styles.popupOverlay} role="dialog" aria-modal="true">
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitleRed}>Penolakan Form BI-DRIVE</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={20} />
          </button>
        </div>

        <form className={styles.popupForm} onSubmit={handleSubmit}>
          <label className={styles.formLabel}>Alasan Penolakan</label>
          <textarea
            className={`${styles.formTextarea} ${styles.formTextareaDanger}`}
            rows={6}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Mohon maaf, transportasi full booked."
          />

          <div className={styles.footerActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className={styles.rejectBtn}
              disabled={loading}
            >
              {loading ? 'Menyimpan…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
