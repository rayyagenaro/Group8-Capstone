// /components/LogoutPopup.js
import React from 'react';
import styles from './LogoutPopup.module.css';

export default function LogoutPopup({ open, onCancel, onLogout }) {
    if (!open) return null;

    return (
        <div className={styles.popupOverlay} onClick={onCancel}>
            <div className={styles.popupBox} onClick={e => e.stopPropagation()}>
                <div className={styles.popupIcon}>
                    <svg width="54" height="54" viewBox="0 0 54 54">
                        <defs>
                            <radialGradient id="logograd" cx="50%" cy="50%" r="60%">
                                <stop offset="0%" stopColor="#ffe77a" />
                                <stop offset="100%" stopColor="#ffd23f" />
                            </radialGradient>
                        </defs>
                        <circle cx="27" cy="27" r="25" fill="url(#logograd)"/>
                        <path d="M32 27H16m0 0l5-5m-5 5l5 5" stroke="#253e70" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <rect x="29" y="19" width="9" height="16" rx="3.2" stroke="#253e70" strokeWidth="2" fill="none"/>
                    </svg>
                </div>
                <div className={styles.popupMsg}>Apakah Anda yakin ingin logout?</div>
                <div className={styles.popupButtonRow}>
                    <button className={styles.cancelButton} onClick={onCancel}>Batal</button>
                    <button className={styles.logoutButton} onClick={onLogout}>Logout</button>
                </div>
            </div>
        </div>
    );
}