// src/components/ketersediaan/care/CalendarAdmin.js
import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
const getMonthMatrix = (year, monthIndex0) => {
  const firstOfMonth = new Date(year, monthIndex0, 1);
  const lastOfMonth  = new Date(year, monthIndex0 + 1, 0);
  const firstDayIdxSun0 = firstOfMonth.getDay();
  const firstDayIdxMon0 = (firstDayIdxSun0 + 6) % 7;
  const daysInMonth = lastOfMonth.getDate();

  const cells = [];
  for (let i = 0; i < firstDayIdxMon0; i++) cells.push(new Date(year, monthIndex0, 1 - (firstDayIdxMon0 - i)));
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, monthIndex0, d));
  while (cells.length < 42) {
    const l = cells[cells.length - 1];
    cells.push(new Date(l.getFullYear(), l.getMonth(), l.getDate() + 1));
  }
  const weeks = [];
  for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};
const toHHMM = (t) => String(t).slice(0, 5);

export default function CalendarAdmin({ doctorId, styles }) {
  const router = useRouter();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // data dari API
  const [slotMap,   setSlotMap]   = useState({});
  const [bookedMap, setBookedMap] = useState({});
  const [adminMap,  setAdminMap]  = useState({});

  // ui
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(() => new Set());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const matrix = useMemo(() => getMonthMatrix(year, month), [year, month]);
  const monthName = cursor.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  const fetchMonth = useCallback(async (y_m) => {
    if (!doctorId) return;
    setLoading(true);
    try {
      const ns = typeof window !== 'undefined'
        ? new URLSearchParams(location.search).get('ns') || ''
        : '';

      const res = await fetch(
        `/api/BIcare/booked?doctorId=${doctorId}&month=${y_m}${ns ? `&ns=${encodeURIComponent(ns)}` : ''}&t=${Date.now()}`,
        {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
          credentials: 'include',             // <<< penting: bawa cookie sesi admin
        }
      );

      if (res.status === 401) {
        alert('Sesi admin habis. Silakan login ulang.');
        router.replace('/Signin/hal-signAdmin');
        return;
      }
      if (!res.ok) throw new Error('fetch calendar fail');

      const data = await res.json();

      const slots = {};
      for (const [k, arr] of Object.entries(data.slotMap || {})) slots[k] = (arr || []).map(toHHMM);
      const booked = {};
      for (const [k, arr] of Object.entries(data.bookedMap || {})) booked[k] = (arr || []).map(toHHMM);
      const admin = {};
      for (const [k, arr] of Object.entries(data.adminBlocks || {})) admin[k] = new Set((arr || []).map(toHHMM));

      setSlotMap(slots);
      setBookedMap(booked);
      setAdminMap(admin);
    } catch (e) {
      console.error('CalendarAdmin fetchMonth error:', e);
      alert('Gagal memuat kalender');
    } finally {
      setLoading(false);
    }
  }, [doctorId, router]);

  const isBooked = (dateStr, time) => (bookedMap[dateStr] || []).includes(time);
  const isAdminBlocked = (dateStr, time) => Boolean(adminMap[dateStr]?.has(time));

  // refresh saat bulan atau doctorId berubah
  const lastKeyRef = useRef(null);
  useEffect(() => {
    const ym = `${year}-${String(month + 1).padStart(2, '0')}`;
    const key = `${doctorId || '-'}:${ym}`;
    if (lastKeyRef.current !== key) {
      lastKeyRef.current = key;
      fetchMonth(ym);
    }
  }, [year, month, doctorId, fetchMonth]);

  // optimistic block/unblock
  const addBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.add(time);
      return { ...prev, [dateStr]: Array.from(set).sort() };
    });
    setAdminMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.add(time);
      return { ...prev, [dateStr]: set };
    });
  };
  const removeBookedAdminLocal = (dateStr, time) => {
    setBookedMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.delete(time);
      return { ...prev, [dateStr]: Array.from(set).sort() };
    });
    setAdminMap(prev => {
      const set = new Set(prev[dateStr] || []);
      set.delete(time);
      return { ...prev, [dateStr]: set };
    });
  };

  const toggleSlot = async (dateObj, time) => {
    const dateStr = ymd(dateObj);
    const adminBlocked = isAdminBlocked(dateStr, time);
    const bookedByUser = isBooked(dateStr, time) && !adminBlocked;
    const slotKey = `${dateStr}_${time}`;

    if (bookedByUser) {
      alert('Slot ini sudah dibooking oleh pengguna. Tidak dapat diubah dari sini.');
      return;
    }

    const action = adminBlocked ? 'unblock' : 'block';
    const ok = confirm(
      adminBlocked
        ? `Buka kembali slot ${time} pada ${dateObj.toLocaleDateString('id-ID')}?`
        : `Tutup slot ${time} pada ${dateObj.toLocaleDateString('id-ID')} untuk pasien?`
    );
    if (!ok) return;

    setPending(prev => new Set(prev).add(slotKey));
    if (action === 'block') addBookedAdminLocal(dateStr, time);
    else removeBookedAdminLocal(dateStr, time);

    try {
      const res = await fetch('/api/ketersediaanAdmin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // <<< bawa cookie juga di mutasi
        body: JSON.stringify({ type: 'bicare_calendar', action, doctorId, bookingDate: dateStr, slotTime: time })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || !out?.success) {
        const ym = `${dateStr.slice(0, 4)}-${dateStr.slice(5, 7)}`;
        await fetchMonth(ym);
        alert(out?.message || 'Gagal menyimpan perubahan slot.');
        return;
      }
      const ym = `${dateStr.slice(0, 4)}-${dateStr.slice(5, 7)}`;
      fetchMonth(ym);
    } catch {
      const ym = `${dateStr.slice(0, 4)}-${dateStr.slice(5, 7)}`;
      await fetchMonth(ym);
      alert('Gagal mengubah slot (jaringan/server).');
    } finally {
      setPending(prev => {
        const next = new Set(prev);
        next.delete(slotKey);
        return next;
      });
    }
  };

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button type="button" className={styles.calNavBtn} onClick={() => setCursor(new Date(year, month - 1, 1))} aria-label="Bulan sebelumnya">‹</button>
        <div className={styles.calTitle}>{monthName} {loading ? <span className={styles.calLoading}>(memuat...)</span> : null}</div>
        <button type="button" className={styles.calNavBtn} onClick={() => setCursor(new Date(year, month + 1, 1))} aria-label="Bulan berikutnya">›</button>
      </div>

      <div className={styles.calDayNames}>
        {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d) => <div key={d} className={styles.calDayName}>{d}</div>)}
      </div>

      <div className={styles.calGrid}>
        {matrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const inMonth = d.getMonth() === month && d.getFullYear() === year;
              const dateStr = ymd(d);
              const sessionsToday = inMonth ? (slotMap[dateStr] || []) : [];
              const doctorOpen = sessionsToday.length > 0;

              return (
                <div key={`${wi}-${di}`} className={`${styles.calCell} ${inMonth ? '' : styles.calCellMuted}`}>
                  <div className={styles.calCellHeader}>
                    <span className={styles.calDateNum}>{d.getDate()}</span>
                    {doctorOpen && <span className={styles.calBadgeOpen}>Buka</span>}
                  </div>

                  {doctorOpen ? (
                    <div className={styles.sessionList}>
                      {sessionsToday.map((time) => {
                        const adminBlocked  = isAdminBlocked(dateStr, time);
                        const bookedByUser  = isBooked(dateStr, time) && !adminBlocked;

                        const slotKey   = `${dateStr}_${time}`;
                        const isPend    = pending.has(slotKey);

                        const disabled  = isPend || bookedByUser;
                        const cls       = (adminBlocked || bookedByUser) ? styles.sessionBooked : styles.sessionAvail;
                        const caption   = adminBlocked ? '• Ditutup' : (bookedByUser ? '• Booked' : '• Available');

                        return (
                          <button
                            key={time}
                            type="button"
                            className={`${styles.sessionBtn} ${cls}`}
                            data-state={adminBlocked ? 'admin' : (bookedByUser ? 'booked' : 'open')}
                            disabled={disabled}
                            onClick={disabled ? undefined : () => toggleSlot(d, time)}
                            title={adminBlocked ? 'Ditutup Admin' : (bookedByUser ? 'Sudah dibooking user' : 'Tersedia')}
                            aria-label={`Sesi ${time} pada ${d.toLocaleDateString('id-ID')}`}
                          >
                            {time} {caption}{isPend ? ' …' : ''}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.sessionListOff}>{inMonth ? 'Tutup' : ''}</div>
                  )}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
