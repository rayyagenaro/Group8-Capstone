import React, { useState } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({ show, onClose, onSubmit, detail }) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');

  // Dummy 10 driver + no HP
  const driverList = [
    { id: 1, name: 'Fikri Ramadhan', hp: '089876543210' },
    { id: 2, name: 'Budi Santoso', hp: '081223344556' },
    { id: 3, name: 'Dewi Lestari', hp: '082112223334' },
    { id: 4, name: 'Aulia Ramdani', hp: '081278856743' },
    { id: 5, name: 'Rahmat Hidayat', hp: '087812345677' },
    { id: 6, name: 'Sari Puspita', hp: '082166781122' },
    { id: 7, name: 'M. Yusuf', hp: '085612347799' },
    { id: 8, name: 'Ahmad Fauzan', hp: '081312348899' },
    { id: 9, name: 'Sri Wahyuni', hp: '087788990011' },
    { id: 10, name: 'Rendi Saputra', hp: '085622331144' }
  ];

  if (!show) return null;

  function handleDriverToggle(id) {
    setSelectedDrivers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!selectedDrivers.length) return;
    const selectedObjs = driverList.filter(d => selectedDrivers.includes(d.id));
    const drivers = selectedObjs.map(d => d.name);
    const noHp = selectedObjs.map(d => d.hp); // tetap dikirim ke backend, walau tidak ditampilkan
    onSubmit({ drivers, noHp, keterangan });
  }

  // Nama driver terpilih saja
  const selectedObjs = driverList.filter(d => selectedDrivers.includes(d.id));
  const selectedNames = selectedObjs.map(d => d.name).join(', ');

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Persetujuan Form D&#39;MOVE</div>
          <button className={styles.closeBtn} onClick={onClose}><FaTimes size={24}/></button>
        </div>
        <form className={styles.popupForm} onSubmit={handleSubmit}>
          <label className={styles.formLabel}>Driver</label>
          <div className={styles.multipleChoiceWrap}>
            {driverList.map(driver => (
              <label key={driver.id} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  value={driver.id}
                  checked={selectedDrivers.includes(driver.id)}
                  onChange={() => handleDriverToggle(driver.id)}
                  className={styles.checkboxInput}
                />
                <span>{driver.name}</span>
              </label>
            ))}
          </div>
          <label className={styles.formLabel}>Nama Driver Terpilih</label>
          <input
            className={styles.formInput}
            type="text"
            value={selectedNames}
            readOnly
            placeholder="Nama driver"
          />
          <label className={styles.formLabel}>Keterangan</label>
          <input
            className={styles.formInput}
            type="text"
            value={keterangan}
            onChange={e => setKeterangan(e.target.value)}
            placeholder="Keterangan"
          />
          <button type="submit" className={styles.submitBtn}>Submit</button>
        </form>
      </div>
    </div>
  );
}
