// /pages/User/fiturbimeet.js
import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/router";
import { FaArrowLeft } from "react-icons/fa";
import DatePicker from "react-datepicker";
import idLocale from "date-fns/locale/id";
import "react-datepicker/dist/react-datepicker.css";
import { getNs, withNs, replaceNs } from "@/lib/ns";
import styles from "./fiturBimeet.module.css";
import SidebarUser from "@/components/SidebarUser/SidebarUser";
import LogoutPopup from "@/components/LogoutPopup/LogoutPopup";

/* ====== FALLBACK ROOMS ====== */
const FALLBACK_ROOMS = [
  { id: 1, name: "Ruang Rapat SP", floor: 2, capacity: 15 },
  { id: 2, name: "Ruang Rapat MI", floor: 3, capacity: 15 },
  { id: 3, name: "Ruangan Blambangan", floor: 4, capacity: 50 },
  { id: 4, name: "Ruangan Jenggolo", floor: 4, capacity: 15 },
  { id: 5, name: "Ruangan Integritas", floor: 4, capacity: 15 },
  { id: 6, name: "Ruangan Profesionalisme", floor: 4, capacity: 15 },
  { id: 7, name: "Ruangan Kahuripan", floor: 5, capacity: 70 },
  { id: 8, name: "Ruangan Singosari", floor: 5, capacity: 300 },
];

/* ====== POPUP SUKSES ====== */
const SuccessPopup = ({ onClose }) => (
  <div className={styles.popupOverlay}>
    <div className={styles.popupBox}>
      <button className={styles.popupClose} onClick={onClose}>
        &times;
      </button>
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
        <b>Pengajuan BI.MEET Berhasil!</b>
      </div>
    </div>
  </div>
);

/* ====== Helpers tanggal lokal anti-geser ====== */
const pad2 = (n) => String(n).padStart(2, "0");
const ymd = (d) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const addMinutes = (date, minutes) => new Date(date.getTime() + minutes * 60000);
const toHHMM = (s) => String(s || "").slice(0, 5);

/* ====== Badge kecil ====== */
const StatusBadge = ({ status, available }) => {
  const s = String(status || "").toLowerCase();
  let color = "#1f8f4e";
  let text = "Tersedia";
  if (s === "maintenance") {
    color = "#d35400";
    text = "Maintenance";
  } else if (available === false) {
    color = "#c0392b";
    text = "Tidak tersedia";
  }
  return <span style={{ fontWeight: 700, color }}>{text}</span>;
};

/* ====== Mini Kalender User ====== */
function MiniMeetCalendar({
  ns,
  roomId,
  onPickSlot, // (dateString 'YYYY-MM-DD', hhmm 'HH:MM')
  selected,   // { dateYMD: 'YYYY-MM-DD', hhmm: 'HH:MM' }
}) {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [slotMap, setSlotMap] = useState({});
  const [bookedMap, setBookedMap] = useState({});
  const [adminBlocks, setAdminBlocks] = useState({});

  // Monday-first month matrix (7×6)
  const getMonthMatrix = useCallback((year, monthIndex0) => {
    const firstOfMonth = new Date(year, monthIndex0, 1);
    const lastOfMonth = new Date(year, monthIndex0 + 1, 0);
    const firstDayIdxSun0 = firstOfMonth.getDay(); // 0=Sun..6=Sat
    const firstDayIdxMon0 = (firstDayIdxSun0 + 6) % 7; // 0=Mon..6=Sun
    const daysInMonth = lastOfMonth.getDate();

    const cells = [];
    for (let i = 0; i < firstDayIdxMon0; i++) {
      const d = new Date(year, monthIndex0, 1 - (firstDayIdxMon0 - i));
      cells.push(d);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push(new Date(year, monthIndex0, d));
    }
    while (cells.length < 42) {
      const last = cells[cells.length - 1];
      cells.push(new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1));
    }
    const weeks = [];
    for (let i = 0; i < 42; i += 7) weeks.push(cells.slice(i, i + 7));
    return weeks;
  }, []);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const monthName = cursor.toLocaleString("id-ID", { month: "long", year: "numeric" });
  const matrix = useMemo(() => getMonthMatrix(year, month), [getMonthMatrix, year, month]);

  // fetch data ketika bulan/room berubah
  const lastYmRef = useRef(null);
  useEffect(() => {
    if (!roomId) return;
    const ymKey = `${year}-${pad2(month + 1)}`;
    if (lastYmRef.current === `${roomId}|${ymKey}`) return;
    lastYmRef.current = `${roomId}|${ymKey}`;

    (async () => {
      setLoading(true);
      setErr("");
      try {
        const qs = new URLSearchParams({
          type: "bimeet_calendar",
          roomId: String(roomId),
          month: ymKey,
        });
        const r = await fetch(withNs(`/api/ketersediaanAdmin?${qs}`, ns), {
          cache: "no-store",
          credentials: "include",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const norm = (m = {}) =>
          Object.fromEntries(
            Object.entries(m).map(([k, arr]) => [k, (arr || []).map(toHHMM)])
          );
        setSlotMap(norm(j?.slotMap || {}));
        setBookedMap(norm(j?.bookedMap || {}));
        setAdminBlocks(norm(j?.adminBlocks || {}));
      } catch (e) {
        setErr(e.message || "Gagal memuat kalender");
        setSlotMap({});
        setBookedMap({});
        setAdminBlocks({});
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId, year, month, ns]);

  const bookedSetByDate = useMemo(() => {
    const m = new Map();
    for (const [k, arr] of Object.entries(bookedMap || {})) {
      m.set(k, new Set((arr || []).map(toHHMM)));
    }
    return m;
  }, [bookedMap]);

  const adminSetByDate = useMemo(() => {
    const m = new Map();
    for (const [k, arr] of Object.entries(adminBlocks || {})) {
      m.set(k, new Set((arr || []).map(toHHMM)));
    }
    return m;
  }, [adminBlocks]);

  const isSameMonth = (d) => d.getMonth() === month && d.getFullYear() === year;
  const isBeforeToday = (d) => ymd(d) < ymd(new Date());

  return (
    <div className={styles.calWrap}>
      <div className={styles.calHeader}>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          aria-label="Bulan sebelumnya"
        >
          ‹
        </button>
        <div className={styles.calTitle}>{monthName}</div>
        <button
          type="button"
          className={styles.calNavBtn}
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          aria-label="Bulan berikutnya"
        >
          ›
        </button>
      </div>

      <div className={styles.calDayNames}>
        {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d) => (
          <div key={d} className={styles.calDayName}>
            {d}
          </div>
        ))}
      </div>

      {err && (
        <div className={styles.errorMsg} style={{ marginBottom: 6 }}>
          {err}
        </div>
      )}
      {loading && <div style={{ fontSize: 13, color: "#5b6b91", marginBottom: 6 }}>Memuat kalender…</div>}

      <div className={styles.calGrid}>
        {matrix.map((week, wi) => (
          <React.Fragment key={wi}>
            {week.map((d, di) => {
              const inMonth = isSameMonth(d);
              const dateStr = ymd(d);
              const slotsToday = (slotMap?.[dateStr] || []).map(toHHMM);
              const hasSlot = inMonth && !isBeforeToday(d) && slotsToday.length > 0;

              return (
                <div
                  key={`${wi}-${di}`}
                  className={`${styles.calCell} ${inMonth ? "" : styles.calCellMuted}`}
                >
                  <div className={styles.calCellHeader}>
                    <span className={styles.calDateNum}>{d.getDate()}</span>
                    {inMonth && slotsToday.length > 0 && (
                      <span className={styles.calBadgeOpen}>Buka</span>
                    )}
                  </div>

                  {hasSlot ? (
                    <div className={styles.sessionList}>
                      {slotsToday.map((time) => {
                        const isBooked = bookedSetByDate.get(dateStr)?.has(time) ?? false;
                        const isAdmin = adminSetByDate.get(dateStr)?.has(time) ?? false;
                        const disabled = isBooked || isAdmin;
                        const isActive = selected
                          && selected.dateYMD === dateStr
                          && selected.hhmm === time;

                        return (
                          <button
                            key={time}
                            type="button"
                            className={[
                              styles.sessionBtn,
                              disabled ? styles.sessionBooked : styles.sessionAvail,
                              isActive ? styles.sessionActive : ""
                            ].join(" ")}
                            disabled={disabled}
                            aria-pressed={isActive ? "true" : "false"}
                            onClick={() => onPickSlot(dateStr, time)}
                            aria-label={`Sesi ${time} pada ${d.toLocaleDateString("id-ID")}`}
                            title={
                              isAdmin
                                ? "Ditutup Admin"
                                : isBooked
                                ? "Sudah Booked"
                                : "Available"
                            }
                          >
                            {time} • {isAdmin ? "Ditutup" : isBooked ? "Booked" : "Available"}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.sessionListOff}>
                      {inMonth ? "Tutup" : ""}
                    </div>
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

export default function FiturBimeet() {
  const router = useRouter();
  const ns = getNs(router);

  const [myProfile, setMyProfile] = useState({ name: "", phone: "", unitKerja: "" });
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await fetch(withNs("/api/me?scope=user", ns), { cache: "no-store", credentials: "include" });
        const j = await r.json();
        if (!active) return;
        const name  = j?.payload?.name  || "";
        const phone = j?.payload?.phone || "";
        const unitKerja  = j?.payload?.unit_kerja || "";
        setMyProfile({ name, phone, unitKerja });
      } catch {}
    })();
    return () => { active = false; };
  }, [ns]);

  // ====== OPTIONS / DATA MASTERS ======
  const [ukerOptions, setUkerOptions] = useState([]);
  const [loadingUker, setLoadingUker] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(withNs("/api/unitkerja", ns), { credentials: "include" });
        if (!res.ok) throw new Error("Gagal fetch unit kerja");
        const data = await res.json();
        setUkerOptions(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error fetch /api/unitkerja:", err);
        setUkerOptions([]);
      } finally {
        setLoadingUker(false);
      }
    })();
  }, [ns]);

  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [showAvail, setShowAvail] = useState(false);

  // ====== FORM STATE ======
  const [fields, setFields] = useState({
    roomId: "",
    unitKerja: "",      // simpan ID
    agenda: "",
    startDate: new Date(),
    endDate: new Date(Date.now() + 60 * 60 * 1000),
    picName: "",
    picPhone: "",
    participants: "",
    notes: "",
  });

  const [errors, setErrors] = useState({});

  // Prefill PIC dari profil (ikutkan unitKerja ID kalau ada match)
  const fillPicFromProfile = () => {
    const matched = ukerOptions.find((u) => u.unit_kerja === myProfile.unitKerja);
    setFields(prev => ({
      ...prev,
      picName: myProfile.name || prev.picName,
      picPhone: myProfile.phone || prev.picPhone,
      unitKerja: matched ? matched.id : prev.unitKerja,
    }));
    setErrors(prev => ({ ...prev, picName: null, picPhone: null }));
  };

  // ====== AVAILABILITY ======
  const [availLoading, setAvailLoading] = useState(false);
  const [availError, setAvailError] = useState("");
  const [availRooms, setAvailRooms] = useState([]);

  useEffect(() => {
    const fetchAvail = async () => {
      setAvailError("");
      setAvailLoading(true);
      try {
        const qs = new URLSearchParams({
          start: fields.startDate.toISOString(),
          end: fields.endDate.toISOString(),
        });
        const r = await fetch(withNs(`/api/bimeet/availability?${qs}`, ns), {
          credentials: "include",
          cache: "no-store",
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        const list = Array.isArray(j?.rooms) ? j.rooms : [];
        setAvailRooms(
          list.length
            ? list
            : FALLBACK_ROOMS.map((x) => ({
                ...x,
                status_name: "Available",
                available: true,
              }))
        );
      } catch (e) {
        setAvailError(e.message || "Gagal mengambil data");
        setAvailRooms(
          FALLBACK_ROOMS.map((x) => ({
            ...x,
            status_name: "Available",
            available: true,
          }))
        );
      } finally {
        setAvailLoading(false);
      }
    };
    if (showAvail) fetchAvail();
  }, [fields.startDate, fields.endDate, showAvail, ns]);

  // ====== OPTIONS ======
  const roomOptions = useMemo(() => {
    const base = availRooms.length ? availRooms : FALLBACK_ROOMS;
    return [...base].sort((a, b) =>
      a.floor === b.floor ? a.name.localeCompare(b.name) : a.floor - b.floor
    );
  }, [availRooms]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handleDateChange = (date, key) => {
    setFields((prev) => ({ ...prev, [key]: date }));
    if (errors[key]) setErrors((p) => ({ ...p, [key]: null }));
  };

  const durationText = useCallback(() => {
    const ms = fields.endDate - fields.startDate;
    if (!ms || ms <= 0 || Number.isNaN(ms)) return "-";
    const mins = Math.round(ms / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h && m) return `${h} jam ${m} menit`;
    if (h) return `${h} jam`;
    return `${m} menit`;
  }, [fields.startDate, fields.endDate]);

  // ====== VALIDASI ======
  const validate = () => {
    const er = {};
    if (!fields.roomId) er.roomId = "Pilih ruangan terlebih dahulu";
    if (!fields.unitKerja) er.unitKerja = "Unit kerja wajib dipilih";
    if (!fields.agenda.trim()) er.agenda = "Agenda rapat wajib diisi";
    if (!fields.startDate) er.startDate = "Mulai pemakaian wajib diisi";
    if (!fields.endDate) er.endDate = "Selesai pemakaian wajib diisi";
    if (fields.endDate && fields.startDate && fields.endDate <= fields.startDate)
      er.endDate = "Selesai harus setelah mulai";
    if (!fields.picName.trim()) er.picName = "Nama PIC wajib diisi";
    if (!fields.picPhone.trim()) er.picPhone = "Nomor WA PIC wajib diisi";
    if (!fields.participants || Number(fields.participants) <= 0)
      er.participants = "Jumlah peserta wajib diisi";

    if (fields.roomId) {
      const r = availRooms.find((x) => String(x.id) === String(fields.roomId));
      if (r && r.available === false) {
        er.roomId = `Ruangan "${r.name}" sedang tidak tersedia (${
          r.status_name || "Booked/Maintenance"
        }).`;
      }
    }
    return er;
  };

  // === ketika user klik slot di kalender ===
  const onPickCalendarSlot = (dateYMD, hhmm) => {
    const [H, M] = hhmm.split(":").map(Number);
    const [y, m, d] = dateYMD.split("-").map(Number);
    const start = new Date(y, m - 1, d, H, M, 0, 0);
    const end = addMinutes(start, 90); // default 90 menit
    setFields((prev) => ({ ...prev, startDate: start, endDate: end }));
  };

  // ====== SUBMIT ======
  const submit = async (e) => {
    e.preventDefault();
    setSubmitError("");

    const er = validate();
    if (Object.keys(er).length) {
      setErrors(er);
      return;
    }

    setIsSubmitting(true);
    try {
      const meRes = await fetch(withNs("/api/me?scope=user", ns), {
        cache: "no-store",
        credentials: "include",
      });
      const me = await meRes.json();
      if (!me?.hasToken || !me?.payload?.sub) {
        setIsSubmitting(false);
        setSubmitError("Sesi Anda berakhir. Silakan login kembali.");
        return;
      }

      // Ambil nama unit kerja dari ID (untuk kompatibilitas dua skema BE)
      const selectedUker = ukerOptions.find(
        (u) => String(u.id) === String(fields.unitKerja)
      );
      const unitKerjaName = selectedUker?.unit_kerja || "";

      // Kirim KEDUANYA: unit_kerja_id dan unit_kerja
      const payload = {
        user_id: me.payload.sub,
        room_id: Number(fields.roomId),
        unit_kerja_id: Number(fields.unitKerja),   // <- untuk BE yang masih pakai *_id
        unit_kerja: unitKerjaName,                 // <- untuk BE yang sudah pakai string
        title: fields.agenda,
        description: fields.notes || null,
        start_date: fields.startDate.toISOString(),
        end_date: fields.endDate.toISOString(),
        participants: Number(fields.participants),
        contact_phone: fields.picPhone,
        pic_name: fields.picName,
      };

      const res = await fetch(withNs("/api/bimeet/createbooking", ns), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = `HTTP ${res.status}`;
        try {
          const t = await res.text();
          if (t) msg += ` – ${t}`;
        } catch {}
        throw new Error(msg);
      }

      setShowSuccess(true);
    } catch (err) {
      setSubmitError(err.message || "Gagal membuat pengajuan BI.MEET.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const closeSuccess = () => {
    setShowSuccess(false);
    router.push(withNs("/User/OngoingBooking/bimeet/hal-orders", ns));
  };

  const handleLogout = async () => {
    try {
      await fetch(withNs("/api/logout", ns), { method: "POST" });
    } finally {
      replaceNs(router, "/Signin/hal-sign");
    }
  };

  return (
    <div className={styles.background}>
      <SidebarUser onLogout={() => setShowLogoutPopup(true)} />

      <main className={styles.mainContent}>
        <div className={styles.formBox}>
          {/* TOP ROW */}
          <div className={styles.topRow}>
            <button
              type="button"
              className={styles.backBtn}
              onClick={() => router.back()}
              aria-label="Kembali"
            >
              <FaArrowLeft aria-hidden="true" />
              <span className={styles.backText}>Kembali</span>
            </button>

            <div className={styles.logoWrapper}>
              <Image src="/assets/D'ROOM.svg" alt="BI.MEET" width={180} height={85} priority />
            </div>

            <div className={styles.availabilitySection}>
              <div className={styles.availabilityLabel}>Availability</div>
              <div className={styles.availabilityDropdownWrap}>
                <button
                  type="button"
                  className={styles.availabilityDropdownBtn}
                  onClick={() => setShowAvail((v) => !v)}
                >
                  Lihat Ketersediaan <span className={styles.availChevron}>▼</span>
                </button>

                {showAvail && (
                  <div className={styles.availabilityDropdown}>
                    {availLoading && <div>Memuat...</div>}
                    {availError && (
                      <div style={{ color: "red", paddingBottom: 8 }}>{availError}</div>
                    )}
                    {!availLoading && (
                      <table>
                        <thead>
                          <tr>
                            <th>Ruangan</th>
                            <th>Lantai</th>
                            <th>Kapasitas</th>
                            <th>Ketersediaan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {roomOptions.map((r) => (
                            <tr key={r.id}>
                              <td>{r.name}</td>
                              <td>{r.floor}</td>
                              <td>{r.capacity} Orang</td>
                              <td>
                                <StatusBadge
                                  status={r.status_name}
                                  available={r.available !== false}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FORM */}
          <form className={styles.formGrid} autoComplete="off" onSubmit={submit}>
            {/* Ruangan */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="roomId">Ruangan Rapat yang Digunakan</label>
                <select
                  id="roomId"
                  name="roomId"
                  value={fields.roomId}
                  onChange={handleChange}
                  className={`${styles.selectReset} ${errors.roomId ? styles.errorInput : ""}`}
                >
                  <option value="">— Pilih Ruangan —</option>
                  {[2, 3, 4, 5].map((lt) => (
                    <optgroup key={lt} label={`Lantai ${lt}`}>
                      {roomOptions
                        .filter((r) => r.floor === lt)
                        .map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name} ({r.capacity} Orang)
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
                {errors.roomId && <span className={styles.errorMsg}>{errors.roomId}</span>}
              </div>
            </div>

            {/* Kalender */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label>Kalender Ketersediaan</label>
                {!fields.roomId && (
                  <div className={styles.errorMsg} style={{ marginBottom: 8 }}>
                    Pilih ruangan dulu untuk melihat slot yang tersedia.
                  </div>
                )}
                {fields.roomId && (
                  <MiniMeetCalendar
                    ns={ns}
                    roomId={fields.roomId}
                    onPickSlot={onPickCalendarSlot}
                    selected={{
                      dateYMD: ymd(fields.startDate),
                      hhmm: `${pad2(fields.startDate.getHours())}:${pad2(fields.startDate.getMinutes())}`
                    }}
                  />
                )}
              </div>
            </div>

            {/* Waktu & Durasi */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="startDate">Mulai Pemakaian</label>
                <DatePicker
                  id="startDate"
                  selected={fields.startDate}
                  onChange={(d) => handleDateChange(d, "startDate")}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd MMMM yyyy HH:mm"
                  timeCaption="Jam"
                  className={errors.startDate ? styles.errorInput : ""}
                  minDate={new Date()}
                  locale={idLocale}
                />
                {errors.startDate && <span className={styles.errorMsg}>{errors.startDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="endDate">Selesai Pemakaian</label>
                <DatePicker
                  id="endDate"
                  selected={fields.endDate}
                  onChange={(d) => handleDateChange(d, "endDate")}
                  showTimeSelect
                  timeFormat="HH:mm"
                  timeIntervals={15}
                  dateFormat="dd MMMM yyyy HH:mm"
                  timeCaption="Jam"
                  className={errors.endDate ? styles.errorInput : ""}
                  minDate={fields.startDate}
                  locale={idLocale}
                />
                {errors.endDate && <span className={styles.errorMsg}>{errors.endDate}</span>}
              </div>

              <div className={styles.formGroup}>
                <label>Durasi</label>
                <input type="text" readOnly value={durationText()} className={styles.readOnlyInput} />
              </div>
            </div>

            {/* Unit Kerja */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="unitKerja">Unit Kerja</label>
                <select
                  id="unitKerja"
                  name="unitKerja"
                  value={fields.unitKerja}
                  onChange={handleChange}
                  className={`${styles.selectReset} ${errors.unitKerja ? styles.errorInput : ""}`}
                >
                  <option value="">— Pilih Unit Kerja —</option>
                  {loadingUker ? (
                    <option disabled>Memuat...</option>
                  ) : (
                    ukerOptions.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.unit_kerja}
                      </option>
                    ))
                  )}
                </select>
                {errors.unitKerja && <span className={styles.errorMsg}>{errors.unitKerja}</span>}
              </div>
            </div>

            {/* Agenda */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="agenda">Agenda Rapat</label>
                <input
                  id="agenda"
                  name="agenda"
                  type="text"
                  placeholder="Contoh: Koordinasi Proyek X"
                  value={fields.agenda}
                  onChange={handleChange}
                  className={errors.agenda ? styles.errorInput : ""}
                />
                {errors.agenda && <span className={styles.errorMsg}>{errors.agenda}</span>}
              </div>
            </div>

            {/* PIC & WA */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <div className={styles.labelRow}>
                  <label htmlFor="picName">Nama PIC Pemesanan</label>
                  <button
                    type="button"
                    className={styles.useMineBtn}
                    onClick={fillPicFromProfile}
                    disabled={!myProfile.name && !myProfile.phone}
                    title={
                      (myProfile.name || myProfile.phone)
                        ? "Isi otomatis dari profil"
                        : "Profil Anda belum memiliki data nama/WA"
                    }
                  >
                    Gunakan data saya
                  </button>
                </div>

                <input
                  id="picName"
                  name="picName"
                  type="text"
                  placeholder="Masukkan Nama PIC"
                  value={fields.picName}
                  onChange={handleChange}
                  className={errors.picName ? styles.errorInput : ""}
                />
                {errors.picName && <span className={styles.errorMsg}>{errors.picName}</span>}
              </div>
              <div className={styles.formGroup}>
                <label htmlFor="picPhone">Nomor WA PIC</label>
                <input
                  id="picPhone"
                  name="picPhone"
                  type="text"
                  placeholder="Masukkan No WA PIC"
                  value={fields.picPhone}
                  onChange={handleChange}
                  className={errors.picPhone ? styles.errorInput : ""}
                />
                {errors.picPhone && <span className={styles.errorMsg}>{errors.picPhone}</span>}
              </div>
            </div>

            {/* Peserta */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="participants">Jumlah Peserta</label>
                <input
                  id="participants"
                  name="participants"
                  type="number"
                  min="1"
                  value={fields.participants}
                  onChange={handleChange}
                  className={errors.participants ? styles.errorInput : ""}
                />
                {errors.participants && (
                  <span className={styles.errorMsg}>{errors.participants}</span>
                )}
              </div>
            </div>

            {/* Keterangan */}
            <div className={styles.formRow}>
              <div className={styles.formGroup}>
                <label htmlFor="notes">Keterangan</label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={fields.notes}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Submit */}
            <div className={styles.buttonWrapper}>
              <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                {isSubmitting ? "Memproses..." : "Booking"}
              </button>
            </div>

            {submitError && (
              <div className={styles.errorMsg} style={{ textAlign: "center", marginTop: 8 }}>
                {submitError}
              </div>
            )}
          </form>
        </div>
      </main>

      {showSuccess && <SuccessPopup onClose={closeSuccess} />}
      <LogoutPopup
        open={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onLogout={handleLogout}
      />
    </div>
  );
}
