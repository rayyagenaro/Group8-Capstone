// src/views/ketersediaan/ketersediaan.js
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/router';
import styles from './ketersediaan.module.css';
import SidebarAdmin from '@/components/SidebarAdmin/SidebarAdmin';
import SidebarFitur from '@/components/SidebarFitur/SidebarFitur';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';
import Pagination from '@/components/Pagination/Pagination';
import { FaChevronDown } from 'react-icons/fa';
import { FaUsers, FaUserMd, FaCalendarAlt } from 'react-icons/fa';
import { verifyAuth } from '@/lib/auth';
import { NS_RE, getNsFromReq } from '@/lib/ns-server';

// SECTION COMPONENTS
import DriversSection from '@/components/ketersediaan/drive/DriversSection';
import VehiclesSection from '@/components/ketersediaan/drive/VehiclesSection';
import DoctorsSection from '@/components/ketersediaan/care/DoctorsSection';
import RulesSection from '@/components/ketersediaan/care/RulesSection';
import CalendarAdmin from '@/components/ketersediaan/care/CalendarAdmin';
import MeetCalendarAdmin from '@/components/ketersediaan/meet/MeetCalendarAdmin';
import RulesMeetSection from '@/components/ketersediaan/meet/RulesMeetSection';
import RoomsSection from '@/components/ketersediaan/meet/RoomsSection';

/* ===== util ===== */
const meetStatusToMap = (arr) => { const m = {}; for (const s of arr) m[s.id] = s.name; return m; };
const initialDriver  = { id: null, nim: '', name: '', phone: '' };
const initialVehicle = { id: null, plat_nomor: '', tahun: '', vehicle_type_id: '', vehicle_status_id: '' };
const initialRoom    = { id: null, name: '', floor: 1, capacity: 1, status_id: 1 };

export default function KetersediaanPage({ initialRoleId = null, initialAllowedServiceIds = null }) {
  const router = useRouter();

  /* ===== helper ns untuk semua fetch ===== */
  const ns = useMemo(() => {
    const qNs = typeof router.query?.ns === 'string' ? router.query.ns : '';
    if (/^[A-Za-z0-9_-]{3,32}$/.test(qNs)) return qNs;
    const q = (router.asPath || '').split('?')[1];
    if (!q) return '';
    const p = new URLSearchParams(q);
    const v = p.get('ns') || '';
    return /^[A-Za-z0-9_-]{3,32}$/.test(v) ? v : '';
  }, [router.query?.ns, router.asPath]);

  const withNs = useCallback((url) => {
    if (!ns) return url;
    return url + (url.includes('?') ? '&' : '?') + 'ns=' + encodeURIComponent(ns);
  }, [ns]);

  /** Fetch mentah (tanpa throw), mengembalikan {ok, status, body, json}  */
  const rawFetch = useCallback(async (url) => {
    const u = withNs(url);
    const res = await fetch(u, { cache: 'no-store' });
    const txt = await res.text().catch(() => '');
    let json;
    try { json = txt ? JSON.parse(txt) : undefined; } catch { json = undefined; }
    return { ok: res.ok, status: res.status, statusText: res.statusText, url: u, body: txt, json };
  }, [withNs]);

  /**
   * Coba beberapa alias type sampai ada yang diterima server.
   * Kriteria sukses: HTTP OK dan (json.success !== false)
   */
  const fetchByTypeAliases = useCallback(async (aliases, labelForError) => {
    const attempts = [];
    for (const t of aliases) {
      const r = await rawFetch(`/api/ketersediaanAdmin?type=${encodeURIComponent(t)}`);
      attempts.push({ t, r });
      if (r.ok && !(r.json && r.json.success === false && /type not valid/i.test(r.json?.message || ''))) {
        // bentuk data bisa {success, data} atau langsung array
        const payload = r.json ?? r.body;
        const data = payload?.data ?? payload;
        return { data, usedType: t };
      }
    }
    const lines = attempts.map(a => `- ${a.t}: ${a.r.status} ${a.r.statusText}${a.r.body ? ` — ${a.r.body}` : ''}`);
    throw new Error(`[${labelForError}] semua alias gagal:\n${lines.join('\n')}`);
  }, [rawFetch]);

  /* ===== pilih sidebar ===== */
  const [roleId, setRoleId] = useState(initialRoleId);
  const [allowedServiceIds, setAllowedServiceIds] = useState(initialAllowedServiceIds);
  const [sbLoading, setSbLoading] = useState(initialRoleId == null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!router.isReady || initialRoleId != null) { setSbLoading(false); return; }
      try {
        const r = await rawFetch('/api/me?scope=admin');
        if (!r.ok) throw new Error(`${r.status} ${r.statusText} ${r.body || ''}`);
        const me = r.json;
        if (!alive) return;
        if (!me?.payload) { setRoleId(null); setSbLoading(false); return; }
        const rl = Number(me.payload.role_id_num ?? me.payload.role_id ?? 0);
        const rs = String(me.payload.role || me.payload.roleNormalized || '').toLowerCase();
        const isSuper = rl === 1 || ['super_admin','superadmin','super-admin'].includes(rs);
        if (isSuper) { setRoleId(1); setAllowedServiceIds(null); }
        else { setRoleId(2); setAllowedServiceIds(Array.isArray(me.payload.service_ids) ? me.payload.service_ids : []); }
      } catch {
        setRoleId(null);
      } finally {
        if (alive) setSbLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router.isReady, initialRoleId, rawFetch]);

  // Tabs
  const [mainTab, setMainTab]   = useState('');
  const [subDrive, setSubDrive] = useState('drivers');  // 'drivers'|'vehicles'
  const [subCare, setSubCare]   = useState('doctors');  // 'doctors'|'rules'|'calendar'
  const [subMeet, setSubMeet]   = useState('rooms');    // 'rooms'|'rules'|'calendar'

  // Data
  const [loading, setLoading] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [careDoctors, setCareDoctors] = useState([]);
  const [careRules, setCareRules] = useState([]);
  const [meetRooms, setMeetRooms] = useState([]);
  const [meetStatus, setMeetStatus] = useState([]);
  const [meetRules, setMeetRules] = useState([]);
  const [vehicleTypes, setVehicleTypes] = useState([]);
  const [vehicleStatuses, setVehicleStatuses] = useState([]);
  const [driverStatuses, setDriverStatuses] = useState([]);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode]   = useState(false);
  const [modalType, setModalType] = useState('drivers');
  const [formData, setFormData]   = useState(initialDriver);

  // Picker state
  const [currentDoctorId, setCurrentDoctorId] = useState(null);
  const [currentRoomId,   setCurrentRoomId]   = useState(null);

  // UI dropdown (dokter)
  const [isDocOpen, setIsDocOpen] = useState(false);
  const docSelRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (docSelRef.current && !docSelRef.current.contains(e.target)) setIsDocOpen(false); };
    const handleEsc = (e) => { if (e.key === 'Escape') setIsDocOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEsc); };
  }, []);

  // UI dropdown (room)
  const [isRoomOpen, setIsRoomOpen] = useState(false);
  const roomSelRef = useRef(null);
  useEffect(() => {
    const handleClickOutside = (e) => { if (roomSelRef.current && !roomSelRef.current.contains(e.target)) setIsRoomOpen(false); };
    const handleEsc = (e) => { if (e.key === 'Escape') setIsRoomOpen(false); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEsc); };
  }, []);

  // Vehicle option loader (dengan fallback alias)
  useEffect(() => {
    if (modalType === 'vehicles') {
      (async () => {
        try {
          const typeRes  = await fetchByTypeAliases(['vehicle_types','vehicles_types'], 'vehicle_types');
          const statRes  = await fetchByTypeAliases(['vehicle_statuses','vehicles_statuses','vehicle_status'], 'vehicle_statuses');
          setVehicleTypes(typeRes.data || []);
          setVehicleStatuses(statRes.data || []);
        } catch (err) {
          console.error(err);
          alert('Gagal load data opsi kendaraan!\n' + String(err.message || err));
        }
      })();
    }
  }, [modalType, fetchByTypeAliases]);

  // Driver status options loader (dengan fallback alias)
  useEffect(() => {
    (async () => {
      try {
        const ds = await fetchByTypeAliases(
          ['driver_statuses','driver_status','drivers_statuses','drivers_status'],
          'driver_statuses'
        );
        setDriverStatuses(ds.data || []);
      } catch (err) {
        console.error(err);
        alert('Gagal load data driver status!\n' + String(err.message || err));
      }
    })();
  }, [fetchByTypeAliases]);

  // Logout
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);
  const handleLogout = async () => {
    try {
      await fetch('/api/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ area: 'admin', ns }),
      });
    } finally {
      router.replace('/Signin/hal-signAdmin');
    }
  };

  // Update driver status
  const [updatingDriverIds, setUpdatingDriverIds] = useState(new Set());
  const updateDriverStatus = async (driverId, newStatusId) => {
    if (!driverId) return;
    setUpdatingDriverIds(prev => new Set(prev).add(driverId));
    try {
      const res = await fetch(withNs('/api/updateDriversStatus'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverId: Number(driverId), newStatusId: Number(newStatusId) }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`updateDriversStatus gagal: ${res.status} ${res.statusText} — ${text}`);
      }
      setDrivers(list =>
        list.map(d => Number(d.id) === Number(driverId) ? { ...d, driver_status_id: Number(newStatusId) } : d)
      );
    } catch (e) {
      alert(e.message || 'Gagal mengubah status driver');
    } finally {
      setUpdatingDriverIds(prev => { const n = new Set(prev); n.delete(driverId); return n; });
    }
  };

  /* ===== Pagination ===== */
  const [page, setPage] = useState({
    drivers: 1, vehicles: 1, care_doctors: 1, care_rules: 1, meet_rooms: 1, meet_rules: 1
  });
  const [perPage, setPerPage] = useState({
    drivers: 10, vehicles: 10, care_doctors: 10, care_rules: 10, meet_rooms: 10, meet_rules: 10
  });
  const tableTopRef = useRef(null);

  /* ===== Fetch awal (dengan alias) ===== */
  useEffect(() => {
    if (!router.isReady) return;
    fetchAll();
  }, [router.isReady]); 

  const fetchAll = async () => {
    setLoading(true);
    const errors = [];

    const safe = async (aliases, key) => {
      try {
        const r = await fetchByTypeAliases(aliases, key);
        return r?.data?.data ?? r?.data ?? [];
      } catch (e) {
        errors.push(`${key}: ${e.message}`);
        return [];
      }
    };

    const driversData   = await safe(['drivers'], 'drivers');
    const vehiclesData  = await safe(['vehicles'], 'vehicles');
    const careDocs      = await safe(['bicare_doctors','care_doctors'], 'care_doctors');
    const careRulesData = await safe(['bicare_rules','care_rules'], 'care_rules');
    const rooms         = await safe(['bimeet_rooms','meet_rooms'], 'meet_rooms');
    const status        = await safe(['bimeet_room_status','meet_room_status','room_status','meet_statuses'], 'meet_room_status');
    const meetRulesData = await safe(['bimeet_rules','meet_rules'], 'meet_rules');

    setDrivers(driversData);
    setVehicles(vehiclesData);

    setCareDoctors(careDocs);
    setCurrentDoctorId(prev =>
      (prev && careDocs.some(d => d.id === prev)) ? prev : (careDocs[0]?.id ?? null)
    );

    setCareRules(careRulesData);

    setMeetRooms(rooms);
    setCurrentRoomId(prev =>
      (prev && rooms.some(r => r.id === prev)) ? prev : (rooms[0]?.id ?? null)
    );

    setMeetStatus(status);
    setMeetRules(meetRulesData);

    setLoading(false);

    if (errors.length) {
      alert('Gagal load data!\n' + errors.join('\n'));
      console.error('[KetersediaanPage] Load errors:', errors);
    }
  };

  /* ===== Modal helpers ===== */
  const handleOpenModal = (type, data = null) => {
    setModalType(type);
    setEditMode(!!data);

    if (type === 'drivers') setFormData(data ? { ...data } : initialDriver);
    else if (type === 'vehicles') setFormData(data ? { ...data } : initialVehicle);
    else if (type === 'bicare_doctors') setFormData(data ? { ...data } : { id: null, name: '', is_active: 1 });
    else if (type === 'bicare_rules') {
      const doctorOptions = careDoctors;
      setFormData(
        data
          ? { ...data, doctorOptions }
          : { id: null, doctor_id: '', weekday: 'MON', start_time: '12:00', end_time: '13:30', slot_minutes: 30, is_active: 1, doctorOptions }
      );
    } else if (type === 'bimeet_rooms') {
      const statusOptions = meetStatus;
      setFormData(data ? { ...data, statusOptions } : { ...initialRoom, statusOptions });
    } else if (type === 'bimeet_rules') {
      const roomOptions = meetRooms;
      setFormData(
        data
          ? { ...data, roomOptions }
          : { id: null, room_id: '', weekday: 'MON', start_time: '08:00', end_time: '17:00', sessions_per_day: 3, is_active: 1, roomOptions }
      );
    }

    setModalOpen(true);
  };

  const handleCloseModal = () => { setModalOpen(false); setEditMode(false); };
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { statusOptions, roomOptions, doctorOptions, ...clean } = formData || {};
    try {
      const res = await fetch(withNs('/api/ketersediaanAdmin'), {
        method: editMode ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...clean, type: modalType }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        throw new Error(`Save gagal: ${res.status} ${res.statusText} — ${txt}`);
      }
      const result = await res.json().catch(()=>({success:false}));
      if (result.success) { await fetchAll(); handleCloseModal(); }
      else { alert(result.message || 'Gagal menyimpan data!'); }
    } catch (err) {
      alert('Gagal terhubung ke server!\n' + String(err.message || err));
    }
  };

  const handleDelete = async (type, id) => {
    if (!confirm('Yakin ingin menghapus data ini?')) return;
    try {
      const res = await fetch(withNs('/api/ketersediaanAdmin'), {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, type }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(()=> '');
        throw new Error(`Delete gagal: ${res.status} ${res.statusText} — ${txt}`);
      }
      const result = await res.json().catch(()=>({success:false}));
      if (result.success) fetchAll();
      else alert(result.message || 'Gagal menghapus!');
    } catch (err) { alert('Gagal menghubungi server!\n' + String(err.message || err)); }
  };

  /* ===== Pagination (aktif list) ===== */
  const activeList = useMemo(() => {
    if (mainTab === 'drive') return subDrive === 'drivers' ? drivers : vehicles;
    if (mainTab === 'care')  return subCare === 'doctors' ? careDoctors : (subCare === 'rules' ? careRules : []);
    if (mainTab === 'meet')  return subMeet === 'rooms' ? meetRooms : (subMeet === 'rules' ? meetRules : []);
    return [];
  }, [mainTab, subDrive, subCare, subMeet,
      drivers, vehicles, careDoctors, careRules, meetRooms, meetRules]);

  const [key, currentPage, itemsPerPage, totalPages, startIdx, endIdx] = (() => {
    let k = 'none';
    if (mainTab === 'drive') k = subDrive === 'drivers' ? 'drivers' : 'vehicles';
    else if (mainTab === 'care') k = subCare === 'doctors' ? 'care_doctors' : 'care_rules';
    else if (mainTab === 'meet') k = subMeet === 'rooms' ? 'meet_rooms' : 'meet_rules';
    const cp = (page[k] || 1);
    const ipp = (perPage[k] || 10);
    const tp = Math.max(1, Math.ceil(activeList.length / (ipp || 10)));
    const s = (cp - 1) * ipp;
    const e = s + ipp;
    return [k, cp, ipp, tp, s, e];
  })();

  const pageRows = useMemo(() => activeList.slice(startIdx, endIdx), [activeList, startIdx, endIdx]);

  useEffect(() => { if (currentPage > totalPages) setPage(p => ({ ...p, [key]: 1 })); }, [totalPages, key, currentPage]);
  const tableTopRefLocal = tableTopRef;

  const onPageChange = useCallback((p) => {
    if (p < 1 || p > totalPages) return;
    setPage(prev => ({ ...prev, [key]: p }));
    tableTopRefLocal.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [key, totalPages, tableTopRefLocal]);

  const onChangeItemsPerPage = (e) => {
    const val = Number(e.target.value);
    setPerPage(prev => ({ ...prev, [key]: val }));
    setPage(prev => ({ ...prev, [key]: 1 }));
    tableTopRefLocal.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const resultsFrom = activeList.length ? startIdx + 1 : 0;
  const resultsTo   = Math.min(endIdx, activeList.length);
  const meetStatusMap = useMemo(() => meetStatusToMap(meetStatus), [meetStatus]);

  // Main tabs (tanpa BI.DOCS)
  const MAIN_TABS = [
    { key: 'drive', label: 'BI.DRIVE', Icon: FaUsers,  serviceId: 1 },
    { key: 'care',  label: 'BI.CARE',  Icon: FaUserMd, serviceId: 2 },
    { key: 'meet',  label: 'BI.MEET',  Icon: FaCalendarAlt, serviceId: 4 },
  ];

  const [isMainOpen, setIsMainOpen] = useState(false);

  const filteredTabs = useMemo(() => {
    if (roleId === 1) return MAIN_TABS;
    if (roleId === 2 && Array.isArray(allowedServiceIds)) {
      const normalized = allowedServiceIds.map(id => Number(id));
      return MAIN_TABS.filter(t => normalized.includes(t.serviceId));
    }
    return [];
  }, [roleId, allowedServiceIds]);

  const currentMain = useMemo(() => {
    if (!filteredTabs || filteredTabs.length === 0) return { key: '', label: 'Tidak Ada Modul', Icon: null };
    if (!mainTab) return { key: '', label: 'Pilih Modul', Icon: null };
    const f = filteredTabs.find(t => t.key === mainTab);
    return f || { key: '', label: 'Pilih Modul', Icon: null };
  }, [mainTab, filteredTabs]);

  const SidebarComp = roleId === 1 ? SidebarAdmin : (roleId === 2 ? SidebarFitur : null);

  return (
    <div className={styles.background}>
      {!sbLoading && SidebarComp && <SidebarComp onLogout={() => setShowLogoutPopup(true)} />}

      <main className={styles.mainContent}>
        <div className={styles.cardContainer}>
          {/* Main Tab as Dropdown */}
          <div className={styles.selectRow} style={{ marginBottom: 14 }}>
            <span className={styles.selectLabel}>Module:</span>

            <div className={styles.selectWrap}>
              <button
                type="button"
                className={styles.selectBtn}
                onClick={() => setIsMainOpen(o => !o)}
                aria-haspopup="listbox"
                aria-expanded={isMainOpen}
              >
                <span className={styles.selectText} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {currentMain && currentMain.Icon
                    ? (() => { const IconC = currentMain.Icon; return <><IconC /> {currentMain.label}</>; })()
                    : (currentMain?.label || 'Pilih Modul')}
                </span>
                <span className={styles.selectCaret}><FaChevronDown /></span>
              </button>

              {isMainOpen && (
                <div
                  className={styles.selectPopover}
                  role="listbox"
                  tabIndex={-1}
                  onKeyDown={(e) => { if (e.key === 'Escape') setIsMainOpen(false); }}
                >
                  {filteredTabs.map(({ key, label, Icon }) => {
                    const active = key === mainTab;
                    return (
                      <div
                        key={key}
                        role="option"
                        aria-selected={active}
                        className={`${styles.selectOption} ${active ? styles.selectOptionActive : ''}`}
                        onClick={() => { setMainTab(key); setIsMainOpen(false); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                      >
                        <Icon /> {label}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* SubTabs */}
          {mainTab === 'drive' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subDrive === 'drivers' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('drivers')}>Driver</button>
              <button className={`${styles.subTabBtn} ${subDrive === 'vehicles' ? styles.subTabActive : ''}`} onClick={() => setSubDrive('vehicles')}>Vehicle</button>
            </div>
          )}

          {mainTab === 'care' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subCare === 'doctors' ? styles.subTabActive : ''}`} onClick={() => setSubCare('doctors')}>Dokter</button>
              <button className={`${styles.subTabBtn} ${subCare === 'rules' ? styles.subTabActive : ''}`} onClick={() => setSubCare('rules')}>Aturan</button>
              <button className={`${styles.subTabBtn} ${subCare === 'calendar' ? styles.subTabActive : ''}`} onClick={() => setSubCare('calendar')}>Kalender</button>
            </div>
          )}

          {mainTab === 'meet' && (
            <div className={styles.subTabs}>
              <button className={`${styles.subTabBtn} ${subMeet === 'rooms' ? styles.subTabActive : ''}`} onClick={() => setSubMeet('rooms')}>Rooms</button>
              <button className={`${styles.subTabBtn} ${subMeet === 'rules' ? styles.subTabActive : ''}`} onClick={() => setSubMeet('rules')}>Aturan</button>
              <button className={`${styles.subTabBtn} ${subMeet === 'calendar' ? styles.subTabActive : ''}`} onClick={() => setSubMeet('calendar')}>Kalender</button>
            </div>
          )}

          <div className={styles.tableWrapper}>
            <div ref={tableTopRef} />

            {/* CARE → Kalender */}
            {mainTab === 'care' && subCare === 'calendar' && (
              <div className={styles.calendarBlock}>
                <div className={styles.selectRow} style={{ justifyContent:'flex-end' }}>
                  <span className={styles.selectLabel}>Pilih Dokter:</span>
                  <div className={styles.selectWrap} ref={docSelRef}>
                    <button
                      type="button"
                      className={styles.selectBtn}
                      onClick={() => setIsDocOpen((o) => !o)}
                      disabled={loading || (careDoctors?.length ?? 0) === 0}
                      aria-haspopup="listbox"
                      aria-expanded={isDocOpen}
                    >
                      <span className={styles.selectText}>
                        {(() => {
                          if (loading) return 'Memuat…';
                          if (!careDoctors || careDoctors.length === 0) return 'Tidak ada dokter';
                          const picked = careDoctors.find((d) => d.id === currentDoctorId) || careDoctors[0];
                          return picked?.name || 'Pilih Dokter';
                        })()}
                      </span>
                      <span className={styles.selectCaret}><FaChevronDown /></span>
                    </button>

                    {isDocOpen && careDoctors && careDoctors.length > 0 && (
                      <div className={styles.selectPopover} role="listbox" tabIndex={-1}>
                        {careDoctors.map((d) => {
                          const active = d.id === currentDoctorId;
                          return (
                            <div
                              key={d.id}
                              role="option"
                              aria-selected={active}
                              className={`${styles.selectOption} ${active ? styles.selectOptionActive : ''}`}
                              onClick={() => { setCurrentDoctorId(d.id); setIsDocOpen(false); }}
                            >
                              {d.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <CalendarAdmin doctorId={currentDoctorId || (careDoctors[0]?.id ?? 1)} styles={styles} />

                <p className={styles.calendarHintAdmin}>
                  Klik slot untuk menutup (membuat booking sistem) atau membuka (menghapus booking sistem).
                  Slot yang sudah dibooking pengguna tidak dapat dibuka dari sini.
                </p>
              </div>
            )}

            {/* MEET → Kalender */}
            {mainTab === 'meet' && subMeet === 'calendar' && (
              <div className={styles.calendarBlock}>
                <div className={styles.selectRow} style={{ justifyContent:'flex-end' }}>
                  <span className={styles.selectLabel}>Pilih Room:</span>
                  <div className={styles.selectWrap} ref={roomSelRef}>
                    <button
                      type="button"
                      className={styles.selectBtn}
                      onClick={() => setIsRoomOpen((o) => !o)}
                      disabled={loading || (meetRooms?.length ?? 0) === 0}
                      aria-haspopup="listbox"
                      aria-expanded={isRoomOpen}
                    >
                      <span className={styles.selectText}>
                        {(() => {
                          if (loading) return 'Memuat…';
                          if (!meetRooms || meetRooms.length === 0) return 'Tidak ada room';
                          const picked = meetRooms.find((r) => r.id === currentRoomId) || meetRooms[0];
                          return picked?.name || 'Pilih Room';
                        })()}
                      </span>
                      <span className={styles.selectCaret}><FaChevronDown /></span>
                    </button>

                    {isRoomOpen && meetRooms && meetRooms.length > 0 && (
                      <div className={styles.selectPopover} role="listbox" tabIndex={-1}>
                        {meetRooms.map((r) => {
                          const active = r.id === currentRoomId;
                          return (
                            <div
                              key={r.id}
                              role="option"
                              aria-selected={active}
                              className={`${styles.selectOption} ${active ? styles.selectOptionActive : ''}`}
                              onClick={() => { setCurrentRoomId(r.id); setIsRoomOpen(false); }}
                            >
                              {r.name}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <MeetCalendarAdmin roomId={currentRoomId || (meetRooms[0]?.id ?? 1)} styles={styles} />

                <p className={styles.calendarHintAdmin}>
                  Klik slot untuk menutup (blok admin) atau membuka. Slot yang sudah dibooking pengguna tidak dapat dibuka dari sini.
                </p>
              </div>
            )}

            {/* MEET → Rules */}
            {mainTab === 'meet' && subMeet === 'rules' && (
              <RulesMeetSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                rooms={meetRooms}
                onAdd={() => handleOpenModal('bimeet_rules')}
                onEdit={(row) => handleOpenModal('bimeet_rules', row)}
                onDelete={(id) => handleDelete('bimeet_rules', id)}
              />
            )}

            {/* DRIVE: Drivers */}
            {mainTab === 'drive' && subDrive === 'drivers' && (
              <DriversSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('drivers')}
                onEdit={(row) => handleOpenModal('drivers', row)}
                onDelete={(id) => handleDelete('drivers', id)}
                onChangeStatus={updateDriverStatus}
                updatingIds={updatingDriverIds}
                statusOptions={driverStatuses}
              />
            )}

            {/* DRIVE: Vehicles */}
            {mainTab === 'drive' && subDrive === 'vehicles' && (
              <VehiclesSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('vehicles')}
                onEdit={(row) => handleOpenModal('vehicles', row)}
                onDelete={(id) => handleDelete('vehicles', id)}
              />
            )}

            {/* CARE: Doctors */}
            {mainTab === 'care' && subCare === 'doctors' && (
              <DoctorsSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                onAdd={() => handleOpenModal('bicare_doctors')}
                onEdit={(row) => handleOpenModal('bicare_doctors', row)}
                onDelete={(id) => handleDelete('bicare_doctors', id)}
              />
            )}

            {/* CARE: Rules */}
            {mainTab === 'care' && subCare === 'rules' && (
              <RulesSection
                styles={styles}
                loading={loading}
                rows={pageRows}
                doctors={careDoctors}
                onAdd={() => handleOpenModal('bicare_rules')}
                onEdit={(row) => handleOpenModal('bicare_rules', row)}
                onDelete={(id) => handleDelete('bicare_rules', id)}
              />
            )}

            {/* Pagination */}
            {!( (mainTab === 'care' && subCare === 'calendar') || (mainTab === 'meet' && subMeet === 'calendar') ) && activeList.length > 0 && (
              <div className={styles.paginateArea}>
                <div className={styles.paginateControls}>
                  <div className={styles.resultsText}>
                    Menampilkan {resultsFrom}-{resultsTo} dari {activeList.length} data
                  </div>
                  <div>
                    <label htmlFor="perPage" className={styles.label}>Items per page:</label>
                    <select id="perPage" className={styles.itemsPerPageDropdown} value={perPage[key] || 10} onChange={onChangeItemsPerPage}>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                </div>
                <Pagination currentPage={page[key] || 1} totalPages={totalPages} onPageChange={onPageChange} />
              </div>
            )}
          </div>
        </div>
      </main>

      <LogoutPopup open={showLogoutPopup} onCancel={() => setShowLogoutPopup(false)} onLogout={handleLogout} />

      {modalOpen && (
        <Modal
          editMode={editMode}
          modalType={modalType}
          formData={formData}
          handleChange={(e) => handleChange(e)}
          handleCloseModal={handleCloseModal}
          handleSubmit={handleSubmit}
          styles={styles}
          vehicleTypes={vehicleTypes}
          vehicleStatuses={vehicleStatuses}
        />
      )}
    </div>
  );
}

/* ===== Modal ===== */
function Modal({
  editMode, modalType, formData, handleChange, handleCloseModal, handleSubmit, styles,
  vehicleTypes = [], vehicleStatuses = [],
}) {
  const titleMap = {
    drivers: 'Driver',
    vehicles: 'Vehicle',
    bicare_doctors: 'Dokter',
    bicare_rules: 'Aturan',
    bimeet_rooms: 'Room',
    bimeet_rules: 'Aturan Room',
  };

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3 className={styles.modalTitle}>
          {editMode ? `Edit ${titleMap[modalType]}` : `Tambah ${titleMap[modalType]}`}
        </h3>

        <form onSubmit={handleSubmit} autoComplete="off">
          {modalType === 'drivers' && (
            <>
              <div className={styles.formGroup}><label>NIK</label>
                <input name="nim" value={formData.nim || ''} onChange={handleChange} required maxLength={50} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Nama</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Phone</label>
                <input name="phone" value={formData.phone || ''} onChange={handleChange} required maxLength={20} className={styles.input} />
              </div>
            </>
          )}

          {modalType === 'vehicles' && (
            <>
              <div className={styles.formGroup}><label>Plat Nomor</label>
                <input name="plat_nomor" value={formData.plat_nomor || ''} onChange={handleChange} required maxLength={20} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Tahun</label>
                <input name="tahun" type="number" min={1990} max={2099} value={formData.tahun || ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Vehicle Type</label>
                <select name="vehicle_type_id" value={formData.vehicle_type_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Vehicle Type</option>
                  {vehicleTypes.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                </select>
              </div>
              <div className={styles.formGroup}><label>Vehicle Status</label>
                <select name="vehicle_status_id" value={formData.vehicle_status_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Vehicle Status</option>
                  {vehicleStatuses.map((opt) => (<option key={opt.id} value={opt.id}>{opt.name}</option>))}
                </select>
              </div>
            </>
          )}

          {modalType === 'bicare_doctors' && (
            <>
              <div className={styles.formGroup}><label>Nama Dokter</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option><option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {modalType === 'bicare_rules' && (
            <>
              <div className={styles.formGroup}><label>Dokter</label>
                <select name="doctor_id" value={formData.doctor_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Dokter</option>
                  {(formData.doctorOptions || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}><label>Hari (MON..SUN)</label>
                <select name="weekday" value={formData.weekday || 'MON'} onChange={handleChange} className={styles.input}>
                  {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}><label>Mulai</label>
                <input name="start_time" type="time" value={formData.start_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Selesai</label>
                <input name="end_time" type="time" value={formData.end_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Slot (menit)</label>
                <input name="slot_minutes" type="number" min={5} max={240} value={formData.slot_minutes || 30} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option><option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          {modalType === 'bimeet_rooms' && (
            <>
              <div className={styles.formGroup}><label>Nama Room</label>
                <input name="name" value={formData.name || ''} onChange={handleChange} required maxLength={100} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Lantai</label>
                <input name="floor" type="number" min={0} max={100} value={formData.floor ?? ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Kapasitas</label>
                <input name="capacity" type="number" min={1} max={10000} value={formData.capacity ?? ''} onChange={handleChange} required className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Status</label>
                <select name="status_id" value={formData.status_id ?? ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Status</option>
                  {(formData.statusOptions || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </>
          )}

          {modalType === 'bimeet_rules' && (
            <>
              <div className={styles.formGroup}><label>Room</label>
                <select name="room_id" value={formData.room_id || ''} onChange={handleChange} required className={styles.input}>
                  <option value="">Pilih Room</option>
                  {(formData.roomOptions || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}><label>Hari (MON..SUN)</label>
                <select name="weekday" value={formData.weekday || 'MON'} onChange={handleChange} className={styles.input}>
                  {['MON','TUE','WED','THU','FRI','SAT','SUN'].map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}><label>Mulai</label>
                <input name="start_time" type="time" value={formData.start_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Selesai</label>
                <input name="end_time" type="time" value={formData.end_time || ''} onChange={handleChange} className={styles.input} />
              </div>
              <div className={styles.formGroup}><label>Sesi per Hari</label>
                <select name="sessions_per_day" value={formData.sessions_per_day || 3} onChange={handleChange} className={styles.input}>
                  {[2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className={styles.formGroup}><label>Aktif</label>
                <select name="is_active" value={formData.is_active ?? 1} onChange={handleChange} className={styles.input}>
                  <option value={1}>Ya</option><option value={0}>Tidak</option>
                </select>
              </div>
            </>
          )}

          <div className={styles.modalBtnGroup}>
            <button type="button" className={styles.btnCancel} onClick={handleCloseModal}>Batal</button>
            <button type="submit" className={styles.btnSave}>Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ===== SSR guard =====
export async function getServerSideProps(ctx) {
  const from = ctx.resolvedUrl || '/Admin/Ketersediaan/hal-ketersediaan';
  const ns = getNsFromReq(ctx.req);

  if (!ns || !NS_RE.test(ns)) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  const auth = await verifyAuth(ctx.req, ['super_admin', 'admin_fitur'], 'admin');
  if (!auth.ok) {
    return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
  }

  if (auth.payload?.roleNormalized === 'super_admin') {
    return { props: { initialRoleId: 1, initialAllowedServiceIds: null } };
  }

  if (auth.payload?.roleNormalized === 'admin_fitur') {
    const allowedServices = Array.isArray(auth.payload?.service_ids) ? auth.payload.service_ids : [];
    const allowedNeeded = [1,2,4].some(id => allowedServices.includes(id));
    if (!allowedNeeded) {
      return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
    }
    return { props: { initialRoleId: 2, initialAllowedServiceIds: allowedServices } };
  }

  return { redirect: { destination: `/Signin/hal-signAdmin?from=${encodeURIComponent(from)}`, permanent: false } };
}
