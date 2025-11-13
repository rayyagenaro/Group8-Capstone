import React, { useEffect, useMemo, useState } from 'react';
import styles from '../rejectVerification/RejectVerification.module.css';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';

export default function CancelVerificationPopup({
  show,
  onClose,
  onSubmit,                 // (reason, openWhatsApp, messageText)
  loading = false,
  person = {},
  titleText = 'Kirimkan Pesan Pembatalan',
  infoText = 'Periksa / ubah pesan yang akan dikirim via WhatsApp. Klik "Batalkan & Kirim" untuk menyimpan dan (opsional) mengirim.',
  previewBuilder,          // (person, reason) => string
  initialReason = '',
  placeholderReason = '— (tuliskan alasan pembatalan di sini) —',
}) {
  const [openWhatsApp, setOpenWhatsApp] = useState(true);
  const [message, setMessage] = useState('');

  const built = useMemo(() => {
    const reason = initialReason || placeholderReason;
    if (typeof previewBuilder === 'function') return previewBuilder(person, reason);
    return `Halo ${person?.name || ''},

Booking Anda *DIBATALKAN* ❌

Alasan:
${reason}

Terima kasih.`;
  }, [person, initialReason, placeholderReason, previewBuilder]);

  useEffect(() => {
    if (show) {
      setOpenWhatsApp(true);
      setMessage(built);
    }
  }, [show, built]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const reason = (initialReason || '').trim();
    if (!reason) { alert('Alasan pembatalan kosong.'); return; }
    onSubmit(reason, openWhatsApp, (message || built).trim());
  };

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
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
            className={styles.previewTextarea}
            rows={12}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={openWhatsApp}
              onChange={(e) => setOpenWhatsApp(e.target.checked)}
            />
            Buka WhatsApp setelah membatalkan
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={styles.rejectBtn} disabled={loading}>
              {loading ? 'Memproses…' : (<><FaWhatsapp style={{marginRight:6}}/> Batalkan & Kirim</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
