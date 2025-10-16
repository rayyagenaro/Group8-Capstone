import React, { useEffect, useState } from 'react';
import { FaTimes, FaStar } from 'react-icons/fa';
import styles from '@/views/history/history.module.css';

/* Tag default yang muncul sebagai quick chips */
const DEFAULT_TAGS = [
  'Tepat waktu', 'Ramah', 'Mobil bersih', 'Nyaman', 'Komunikasi jelas', 'Rute efisien'
];

function StarInput({ value, onChange }) {
  return (
    <div className={styles.starRow}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.starBtn} ${value >= n ? styles.starActive : ''}`}
          onClick={() => onChange(n)}
          aria-label={`${n} bintang`}
        >
          <FaStar />
        </button>
      ))}
    </div>
  );
}

function TagSelector({ tags, selected, onToggle }) {
  return (
    <div className={styles.tagsWrap}>
      {tags.map((t) => {
        const active = (selected || []).includes(t);
        return (
          <button
            key={t}
            type="button"
            className={`${styles.tagChip} ${active ? styles.tagChipActive : ''}`}
            onClick={() => onToggle(t)}
          >
            {t}
          </button>
        );
      })}
    </div>
  );
}

export default function RatingModal({ open, onClose, onSubmit, booking, submitting }) {
  const [rating, setRating] = useState(0);
  const [chosen, setChosen] = useState([]);
  const [comment, setComment] = useState('');

  /* Hooks selalu terpanggil di atas; aman dari rules hooks */
  useEffect(() => {
    if (!open) return;
    setRating(0); setChosen([]); setComment('');
  }, [open]);

  if (!open) return null;

  const toggleTag = (t) => {
    setChosen((prev) => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };
  const handleSubmit = () => {
    if (!rating) return alert('Pilih rating bintang terlebih dahulu.');
    onSubmit?.({
      bookingId: Number(String(booking?.id ?? '').match(/(\d+)$/)?.[1] || NaN),
      rating_overall: rating,
      tags: chosen,
      comment_text: (comment || '').trim(),
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={() => !submitting && onClose?.()}>
      <div className={styles.ratingModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={() => !submitting && onClose?.()} type="button">
          <FaTimes />
        </button>

        <h3 className={styles.ratingTitle}>Beri Penilaian BI-DRIVE</h3>
        <p className={styles.ratingSubtitle}>
          Untuk perjalanan ke <strong>{booking?.tujuan || '-'}</strong>. Terima kasih telah membantu kami meningkatkan layanan.
        </p>

        <div className={styles.ratingSection}>
          <div className={styles.sectionLabel}>Rating Anda</div>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div className={styles.ratingSection}>
          <div className={styles.sectionLabel}>Hal yang paling berkesan <span className={styles.optional}>(opsional)</span></div>
          <TagSelector tags={DEFAULT_TAGS} selected={chosen} onToggle={toggleTag} />
        </div>

        <div className={styles.ratingSection}>
          <div className={styles.sectionLabel}>Komentar <span className={styles.optional}>(opsional)</span></div>
          <textarea
            className={styles.commentInput}
            placeholder="Tulis komentar Anda di sini…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
          />
        </div>

        <div className={styles.ratingActions}>
          <button type="button" className={styles.btnSecondary} onClick={() => !submitting && onClose?.()}>
            Nanti Saja
          </button>
          <button type="button" className={styles.btnPrimary} onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Mengirim...' : 'Kirim Penilaian'}
          </button>
        </div>
      </div>
    </div>
  );
}
