// components/rejectReason/ReasonPopup.js
import React, { useEffect, useState } from "react";
import styles from "./ReasonPopup.module.css";
import { FaTimes } from "react-icons/fa";

export default function RejectReasonAsk({
  show,
  title = "Alasan Penolakan",
  placeholder = "Tulis alasan singkat & jelas…",
  initialReason = "",
  onClose,
  onSubmit, // (reasonText) => void
}) {
  const [reason, setReason] = useState(initialReason);

  useEffect(() => {
    if (show) setReason(initialReason || "");
  }, [show, initialReason]);

  if (!show) return null;

  const submit = (e) => {
    e.preventDefault();
    const val = (reason || "").trim();
    if (!val) {
      alert("Alasan wajib diisi.");
      return;
    }
    onSubmit(val);
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.box} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup">
            <FaTimes size={18} />
          </button>
        </div>

        <form className={styles.form} onSubmit={submit}>
          <label className={styles.label}>Alasan</label>
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
            <button type="submit" className={styles.submitBtn}>
              Lanjut
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
