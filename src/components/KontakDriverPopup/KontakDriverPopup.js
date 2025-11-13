// src/components/KontakDriverPopup/KontakDriverPopup.js
import React, { useMemo, useState, useEffect } from 'react';
import { FaTimes, FaWhatsapp } from 'react-icons/fa';

export default function KontakDriverPopup({ show, onClose, drivers = [], booking = {} }) {
  const [mode, setMode] = useState('driver'); // 'driver' | 'user'

  // ===== Helpers =====
  const toWaNumber = (val) => {
    if (!val) return '';
    let p = String(val).trim().replace(/[^\d]/g, '');
    if (!p) return '';
    if (p.startsWith('62')) return p.replace(/^620+/, '62');
    if (p.startsWith('0'))  return '62' + p.slice(1);
    if (p.startsWith('8'))  return '62' + p;
    return p;
  };

  const fmtDateTime = (d) => {
    if (!d) return '-';
    const x = new Date(d);
    if (Number.isNaN(x.valueOf())) return String(d);
    return x.toLocaleString('id-ID', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // === sumber data dari booking ===
  const tujuan   = booking?.tujuan || '-';
  const startStr = fmtDateTime(booking?.start_date);
  const endStr   = fmtDateTime(booking?.end_date);

  const vehicles = Array.isArray(booking?.assigned_vehicles) ? booking.assigned_vehicles : [];
  const driverList = Array.isArray(drivers) ? drivers : [];

  const driverNames = driverList
    .map(d => d.name || d.driver_name)
    .filter(Boolean)
    .join(', ') || '-';

  const vehicleTexts = vehicles.map(v => {
    const plate = v.plate || v.plat_nomor || v.nopol || v.no_polisi || '';
    const type  = v.type_name || v.name || '';
    return [plate, type].filter(Boolean).join(' — ');
  }).join('; ') || '-';

  // Nama user fallback (karena tabel tidak punya user_name)
  const userName =
    booking?.user_name ||
    booking?.pemohon ||
    booking?.applicant_name ||
    'Pemohon';

  // Nomor user ambil dari kolom phone pada bidrive_booking
  const userPhone = booking?.phone || '';

  // Draft pesan default per mode (editable)
  const defaultDriverText = useMemo(() => (
`Halo {name}, terkait tugas perjalanan BI.DRIVE.

Tujuan  : ${tujuan}
Mulai   : ${startStr}
Selesai : ${endStr}

Mohon konfirmasi kesiapan ya. Terima kasih.`
  ), [tujuan, startStr, endStr]);

  const defaultUserText = useMemo(() => (
`Halo ${userName}, pengajuan BI.DRIVE Anda telah *disetujui*.

Tujuan   : ${tujuan}
Jadwal   : ${startStr} — ${endStr}

Driver   : ${driverNames}
Kendaraan: ${vehicleTexts}

Silakan cek detail pesanan Anda. Terima kasih.`
  ), [userName, tujuan, startStr, endStr, driverNames, vehicleTexts]);

  const [driverMsg, setDriverMsg] = useState(defaultDriverText);
  const [userMsg, setUserMsg]     = useState(defaultUserText);

  // Sinkronkan ketika booking berubah
  useEffect(() => { setDriverMsg(defaultDriverText); }, [defaultDriverText]);
  useEffect(() => { setUserMsg(defaultUserText); },   [defaultUserText]);

  if (!show) return null;

  const currentMsg = mode === 'driver' ? driverMsg : userMsg;
  const setCurrent = mode === 'driver' ? setDriverMsg : setUserMsg;

  const recipients = mode === 'driver'
    ? driverList.map(d => ({
        id: d.id,
        name: d.name || d.driver_name || 'Driver',
        phone: d.phone || d.no_hp || d.wa || '',
      }))
    : [{
        id: 'user',
        name: userName,
        phone: userPhone, // <= dari kolom phone tabel bidrive_booking
      }];

  const openWA = (rawPhone, name) => {
    const to = toWaNumber(rawPhone);
    if (!to) return alert('Nomor WhatsApp tidak tersedia.');
    const msg = currentMsg.replace(/\{name\}/gi, name || '');
    window.open(`https://wa.me/${to}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={S.overlay} role="dialog" aria-modal="true" aria-labelledby="kontakTitle">
      <div style={S.modal}>
        {/* Header */}
        <div style={S.header}>
          <h2 id="kontakTitle" style={S.title}>Kontak {mode === 'driver' ? 'Driver' : 'User'}</h2>
          <button onClick={onClose} style={S.closeBtn} aria-label="Tutup">
            <FaTimes />
          </button>
        </div>

        {/* Toggle */}
        <div style={S.tabWrap}>
          <button
            type="button"
            onClick={() => setMode('driver')}
            style={{ ...S.tabBtn, ...(mode === 'driver' ? S.tabActive : {}) }}
          >
            Ke Driver
          </button>
          <button
            type="button"
            onClick={() => setMode('user')}
            style={{ ...S.tabBtn, ...(mode === 'user' ? S.tabActive : {}) }}
          >
            Ke User
          </button>
        </div>

        {/* Hint */}
        <div style={S.hintBox}>
          Kirim pesan konfirmasi ke {mode}. Pesan di bawah bisa kamu <b>edit</b>.
        </div>

        {/* Editor Pesan */}
        <div style={S.label}>Pesan WhatsApp</div>
        <textarea
          style={S.textarea}
          rows={8}
          value={currentMsg}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Tulis pesan…"
        />

        {/* Tabel Penerima */}
        <div style={{ marginTop: 18, flex: 1, overflowY: 'auto' }}>
          <div style={S.tableHead}>
            <div style={{ flex: 2 }}>Nama</div>
            <div style={{ flex: 2 }}>No HP</div>
            <div style={{ width: 140, textAlign: 'right' }}>Aksi</div>
          </div>

          {recipients.map((r) => (
            <div key={r.id} style={S.tableRow}>
              <div style={{ flex: 2 }}>{r.name || '-'}</div>
              <div style={{ flex: 2 }}>{r.phone || '-'}</div>
              <div style={{ width: 140, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => openWA(r.phone, r.name)}
                  style={S.waBtn}
                  disabled={!r.phone}
                  title={r.phone ? 'Kirim via WhatsApp' : 'Nomor tidak tersedia'}
                >
                  <FaWhatsapp style={{ marginRight: 8 }} /> Hubungi
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ====== Inline Styles ====== */
const S = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18
  },
  modal: {
    width: '100%', maxWidth: 920, maxHeight: '90vh', background: '#fff', borderRadius: 16,
    boxShadow: '0 20px 60px rgba(2,8,23,.25)', display: 'flex', flexDirection: 'column', padding: 20
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: '#1e293b', letterSpacing: '.02em' },
  closeBtn: {
    background: 'transparent', border: 'none', cursor: 'pointer',
    fontSize: 18, color: '#475569', padding: 8, borderRadius: 8
  },
  tabWrap: {
    display: 'inline-flex', background: '#eef2ff', borderRadius: 9999, padding: 4, gap: 4, margin: '6px 0 12px 0'
  },
  tabBtn: {
    border: 'none', padding: '8px 16px', borderRadius: 9999, cursor: 'pointer',
    background: 'transparent', fontWeight: 700, color: '#475569'
  },
  tabActive: {
    background: '#1f2937', color: '#fff'
  },
  hintBox: {
    background: '#eef2ff', border: '1px solid #dbeafe', color: '#334155',
    padding: '12px 14px', borderRadius: 10, marginBottom: 12
  },
  label: { fontSize: 16, fontWeight: 800, color: '#1f2937', marginBottom: 8 },
  textarea: {
    width: '100%', borderRadius: 12, border: '1px solid #dbeafe', padding: 14,
    fontSize: 16, background: '#f8fbff', outline: 'none', color: '#1f2937'
  },
  tableHead: {
    display: 'flex', alignItems: 'center',
    background: '#f1f5f9', color: '#0f172a', fontWeight: 800,
    padding: '14px 16px', borderRadius: 12, marginTop: 18
  },
  tableRow: {
    display: 'flex', alignItems: 'center',
    padding: '16px 16px', borderBottom: '1px solid #e2e8f0', color: '#0f172a'
  },
  waBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    padding: '10px 16px', borderRadius: 12, border: 'none', cursor: 'pointer',
    background: '#25D366', color: '#fff', fontWeight: 800, minWidth: 120,
    boxShadow: '0 6px 14px rgba(37,211,102,.25)'
  }
};
