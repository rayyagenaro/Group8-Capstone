import React from 'react';
import styles from './RejectionBox.module.css';

export default function RejectionBox({ reason, compact = false, title = 'Alasan Penolakan' }) {
  if (!reason) return null;
  return (
    <div className={compact ? styles.rejectMini : styles.rejectBox}>
      <div className={compact ? styles.rejectMiniTitle : styles.rejectTitle}>{title}</div>
      <div className={compact ? styles.rejectMiniText : styles.rejectText}>{reason}</div>
    </div>
  );
}
