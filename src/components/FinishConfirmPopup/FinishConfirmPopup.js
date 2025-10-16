import React, { useEffect } from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

export default function FinishConfirmPopup({
  show = false,
  onCancel,
  onConfirm,
  finishing = false,
  styles
}) {
  if (!show) return null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !finishing) onCancel?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, finishing]);

  return (
    <div
      style={overlayStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="finishTitle"
      onClick={() => { if (!finishing) onCancel?.(); }}
    >
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={headerStyle}>
          <div style={iconWrapStyle}>
            <FaExclamationTriangle style={{ fontSize: 22, color: '#F59E0B' }} />
          </div>
          <h3 id="finishTitle" style={titleStyle}>Finish Booking?</h3>
        </div>

        <div style={bodyStyle}>
          <p style={pStyle}>
            Tindakan ini akan menandai booking sebagai <strong>selesai</strong>.
          </p>
          <p style={pStyle}>
            <strong>Perhatian:</strong><br />
            Booking tidak bisa diubah lagi setelah finish. Pastikan booking Anda benar-benar telah selesai.
          </p>
        </div>

        <div style={footerStyle}>
          <button
            type="button"
            onClick={() => onCancel?.()}
            className={styles?.btnTolak}
            style={btnStyle}
            disabled={finishing}
          >
            Batal Finish
          </button>
          <button
            type="button"
            onClick={() => onConfirm?.()}
            className={styles?.btnSetujui}
            style={btnStyle}
            disabled={finishing}
          >
            {finishing ? 'Memproses…' : 'Ya, Finish Booking'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ==== Inline styles (responsive) ==== */
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,.45)',
  zIndex: 9999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px',
};

const modalStyle = {
  width: 'min(560px, 92vw)',
  background: '#fff',
  borderRadius: 16,
  boxShadow: '0 20px 60px rgba(15,23,42,.25)',
  overflow: 'hidden',

  // penting untuk HP tinggi kecil
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
};

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  padding: '18px 18px 10px 18px',
};

const iconWrapStyle = {
  width: 36,
  height: 36,
  borderRadius: 9999,
  background: 'rgba(245,158,11,.12)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const titleStyle = {
  margin: 0,
  // skala judul sesuai layar
  fontSize: 'clamp(18px, 3.8vw, 20px)',
  color: '#111827',
  fontWeight: 800,
  letterSpacing: '.01em',
};

const bodyStyle = {
  padding: '0 18px 6px 18px',
  overflow: 'auto', // kalau paragraf kepanjangan di HP
};

const pStyle = {
  margin: '10px 0',
  color: '#374151',
  lineHeight: 1.55,
  fontSize: 'clamp(14px, 3.4vw, 15.5px)',
};

const footerStyle = {
  display: 'flex',
  gap: 12,
  // wrap agar tombol otomatis turun di layar kecil
  flexWrap: 'wrap',
  padding: '14px 18px',
  paddingBottom: 'max(18px, env(safe-area-inset-bottom))',
};

const btnStyle = {
  // grow di layar lebar, full width saat sempit (karena wrap + basis)
  flex: '1 1 220px',
  minWidth: 0,
  height: 44,
};
