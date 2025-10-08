import React from 'react';
import styles from './SuccessPopup.module.css'; // bikin file css module terpisah

export default function SuccessPopup({ message = "Berhasil Sign In" }) {
  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupIcon}>
          <svg width="70" height="70" viewBox="0 0 70 70">
            <circle cx="35" cy="35" r="35" fill="#7EDC89" />
            <polyline 
              points="23,36 33,46 48,29" 
              fill="none" 
              stroke="#fff" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <div className={styles.popupMsg}>
          <b>{message}</b>
        </div>
      </div>
    </div>
  );
}
