import React, { useEffect, useMemo, useState } from 'react';
import styles from './RejectVerification.module.css';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';

/**
 * Popup Kirim Pesan Penolakan (STEP-2)
 * - Tidak menanyakan alasan lagi (pakai initialReason dari step-1)
 * - Pesan WhatsApp editable dan selalu terbuka
 * - onSubmit(reasonFromStep1, openWhatsApp, messageText)
 */
export default function RejectVerificationPopup({
  show,
  onClose,
  onSubmit,                 // (reason, openWhatsApp, messageText)
  loading = false,
  person = {},
  titleText = 'Kirimkan Pesan Penolakan',
  infoText = 'Periksa / ubah pesan yang akan dikirim via WhatsApp. Klik "Tolak & Kirim" untuk menyimpan dan (opsional) mengirim.',
  previewBuilder,          // (person, reason) => string
  initialReason = '',      // reason dari step-1
  placeholderReason = '— (tuliskan alasan singkat & jelas di sini) —',
}) {
  const [openWhatsApp, setOpenWhatsApp] = useState(true);
  const [message, setMessage] = useState('');

  const built = useMemo(() => {
    const reason = initialReason || placeholderReason;
    if (typeof previewBuilder === 'function') return previewBuilder(person, reason);
    return `Halo ${person?.name || ''},

Pengajuan Anda *DITOLAK* ❌

Alasan:
${reason}

Silakan lakukan perbaikan/pengajuan ulang. Terima kasih.`;
  }, [person, initialReason, placeholderReason, previewBuilder]);

  useEffect(() => {
    if (show) {
      setOpenWhatsApp(true);
      setMessage(built);    // prefill editor dengan template
    }
  }, [show, built]);

  if (!show) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const reason = (initialReason || '').trim();
    if (!reason) { alert('Alasan penolakan kosong.'); return; }
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

        {/* HANYA editor pesan WA, selalu terbuka */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>Pesan WhatsApp</label>
          <textarea
            className={styles.previewTextarea}
            rows={12}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ color: '#111827' }}  // teks hitam
          />

          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={openWhatsApp}
              onChange={(e) => setOpenWhatsApp(e.target.checked)}
            />
            Buka WhatsApp setelah menolak
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={loading}>
              Batal
            </button>
            <button type="submit" className={styles.rejectBtn} disabled={loading}>
              {loading ? 'Memproses…' : (<><FaWhatsapp style={{marginRight:6}}/> Tolak & Kirim</>)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
