import React, { useState, useRef, useEffect, useCallback} from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import styles from './fiturDmove.module.css';
import { FaHome, FaClipboardList, FaCog, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';
import { addDays } from 'date-fns';
import idLocale from 'date-fns/locale/id';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import SidebarUser from '@/components/SidebarUser/SidebarUser';
import LogoutPopup from '@/components/LogoutPopup/LogoutPopup';

// --- CUSTOM HOOKS ---
const useDropdown = (initialState = false) => {
    const [isOpen, setIsOpen] = useState(initialState);
    const ref = useRef(null);
    const handleClickOutside = useCallback((event) => {
        if (ref.current && !ref.current.contains(event.target)) setIsOpen(false);
    }, []);
    useEffect(() => {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handleClickOutside]);
    return { isOpen, setIsOpen, ref };
};

const SuccessPopup = ({ onClose }) => (
    <div className={styles.popupOverlay}>
        <div className={styles.popupBox}>
            <button className={styles.popupClose} onClick={onClose}>&times;</button>
            <div className={styles.popupIcon}><svg width="70" height="70" viewBox="0 0 70 70"><circle cx="35" cy="35" r="35" fill="#7EDC89" /><polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
            <div className={styles.popupMsg}><b>Booking DMOVE Telah Berhasil!</b></div>
        </div>
    </div>
);

// --- helper: format ke MySQL DATETIME (YYYY-MM-DD HH:mm:ss) ---
const toMySQLDateTime = (date) => {
    const d = new Date(date);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

// --- KOMPONEN UTAMA ---
export default function FiturDmove() {
    const [availabilityData, setAvailabilityData] = useState(null);
    useEffect(() => {
        fetch('/api/vehicleAvailability')
            .then(res => res.ok ? res.json() : Promise.reject('Gagal ambil data availability'))
            .then(setAvailabilityData)
            .catch(err => console.error('Error availability:', err));
    }, []);

    const router = useRouter();
    const { ns } = router.query;
    const { isOpen: isVehicleDropdownOpen, setIsOpen: setVehicleDropdownOpen, ref: vehicleDropdownRef } = useDropdown();

    const getMaxQuantity = (typeId) => {
        if (!availabilityData?.vehicles) return Infinity;
        const item = availabilityData.vehicles.find(v => v.type_id === typeId);
        return item ? item.available : 0;
    };

    const [fields, setFields] = useState({
        jumlahDriver: '',
        jenisKendaraan: [],
        tujuan: '',
        jumlahOrang: '',
        jumlahKendaraan: 0,
        volumeBarang: '',
        noHp: '',
        keterangan: '',
        file_link: '',
        startDate: new Date(),
        endDate: addDays(new Date(), 1),
    });

    const [errors, setErrors] = useState({});
    const [vehicleTypesOptions, setVehicleTypesOptions] = useState([]);
    const [isLoadingOptions, setIsLoadingOptions] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);
    const [showLogoutPopup, setShowLogoutPopup] = useState(false);

    // --- di atas, dekat state lain
    const [myPhone, setMyPhone] = useState('');

    // … di dalam useEffect sekali jalan (setelah router/useEffect lainnya juga boleh)
    useEffect(() => {
    (async () => {
        try {
        const r = await fetch('/api/me?scope=user', { cache: 'no-store' });
        const d = await r.json();
        // ambil dari beberapa kemungkinan key
        const p = d?.payload || {};
        const phone =
            p.phone ||
            p.phone_number ||
            p.no_hp ||
            p.wa ||
            p.whatsapp ||
            p.contact_phone ||
            '';
        if (phone) setMyPhone(String(phone));
        } catch {}
    })();
    }, []);

    useEffect(() => {
        setIsLoadingOptions(true);
        fetch('/api/vehicle-types')
            .then(res => res.ok ? res.json() : Promise.reject(res))
            .then(data => setVehicleTypesOptions(data))
            .catch(err => console.error("Gagal fetch vehicle types:", err))
            .finally(() => setIsLoadingOptions(false));
    }, []);

    useEffect(() => {
        const totalKendaraan = fields.jenisKendaraan.reduce((sum, vehicle) => sum + vehicle.quantity, 0);
        setFields(prev => ({ ...prev, jumlahKendaraan: totalKendaraan }));
    }, [fields.jenisKendaraan]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFields(prevFields => ({
            ...prevFields,
            [name]: value
        }));
    };

    const handleQuantityChange = (option, change) => {
        setFields(prev => {
            const maxForThisType = getMaxQuantity(option.id);
            const existing = prev.jenisKendaraan.find(item => item.id === option.id);
            let newSelection = [...prev.jenisKendaraan];

            if (existing) {
                let newQuantity = existing.quantity + change;
                if (newQuantity <= 0) {
                    newSelection = newSelection.filter(item => item.id !== option.id);
                } else {
                    if (newQuantity > maxForThisType) newQuantity = maxForThisType;
                    newSelection = newSelection.map(item =>
                        item.id === option.id ? { ...item, quantity: newQuantity } : item
                    );
                }
            } else if (change > 0) {
                if (maxForThisType > 0) {
                    newSelection.push({ ...option, quantity: 1 });
                } else {
                    alert(`Stok ${option.name} sedang tidak tersedia.`);
                }
            }

            return { ...prev, jenisKendaraan: newSelection };
        });
        if (errors.jenisKendaraan) setErrors(prev => ({ ...prev, jenisKendaraan: null }));
    };

    const handleDateChange = (date, field) => {
        setFields(prev => ({ ...prev, [field]: date }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const validate = () => {
        const err = {};
        if (!fields.tujuan.trim()) err.tujuan = 'Tujuan wajib diisi';
        if (fields.jenisKendaraan.length === 0) err.jenisKendaraan = 'Pilih minimal satu kendaraan';
        if (!fields.noHp.trim()) err.noHp = 'Nomor HP wajib diisi';
        if (!fields.startDate) err.startDate = 'Tanggal mulai wajib diisi';
        if (!fields.endDate) err.endDate = 'Tanggal selesai wajib diisi';
        if (fields.endDate <= fields.startDate) err.endDate = 'Tanggal selesai harus setelah tanggal mulai';

        // Validasi jumlah driver
        const maxDrivers = availabilityData?.drivers ?? Infinity;
        const jumlahDriver = parseInt(fields.jumlahDriver, 10);
        if (!jumlahDriver || jumlahDriver <= 0) {
            err.jumlahDriver = 'Jumlah driver wajib diisi';
        } else if (jumlahDriver > maxDrivers) {
            err.jumlahDriver = `Jumlah driver melebihi batas. Maksimal ${maxDrivers} tersedia.`;
        }

        // Validasi jenis kendaraan melebihi stok
        if (availabilityData?.vehicles?.length > 0) {
            for (const vehicle of fields.jenisKendaraan) {
                const avail = availabilityData.vehicles.find(v => v.type_id === vehicle.id);
                const max = avail ? avail.available : 0;
                if (vehicle.quantity > max) {
                    err.jenisKendaraan = `Jumlah ${vehicle.name} melebihi stok (maks ${max}).`;
                    break;
                }
            }
        }

        // --- Wajib: Link File ---
        if (!fields.file_link.trim()) {
            err.file_link = 'Link file wajib diisi';
        } else {
            const simpleUrl = /^(https?:\/\/|www\.)/i;
            if (!simpleUrl.test(fields.file_link.trim())) {
                err.file_link = 'Masukkan tautan yang valid (awali dengan http(s):// atau www.)';
            }
        }

        return err;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitError('');

        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }
        setErrors({});
        setIsSubmitting(true);

        try {
            // Ambil data user dari token di cookie
            const meRes = await fetch('/api/me?scope=user', { cache: 'no-store' });
            const meData = await meRes.json();

            if (!meData.hasToken || !meData.payload?.sub) {
                setSubmitError("Sesi Anda berakhir. Silakan login kembali.");
                setIsSubmitting(false);
                return;
            }

            const payload = {
                user_id: meData.payload.sub,
                tujuan: fields.tujuan,
                jumlah_orang: parseInt(fields.jumlahOrang, 10) || null,
                jumlah_kendaraan: fields.jumlahKendaraan,
                volume_kg: parseInt(fields.volumeBarang, 10) || null,
                // >>>> hanya ini yang diubah: kirim format MySQL
                start_date: toMySQLDateTime(fields.startDate),
                end_date: toMySQLDateTime(fields.endDate),
                phone: fields.noHp,
                keterangan: fields.keterangan,
                file_link: fields.file_link,
                jumlah_driver: parseInt(fields.jumlahDriver, 10),
                vehicle_details: fields.jenisKendaraan.map(({ id, quantity }) => ({ id, quantity })),
            };

            const res = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || 'Gagal membuat booking.');
            }

            setShowSuccess(true);
        } catch (error) {
            setSubmitError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- AvailabilitySection (pakai /api/vehicle-availability) ---
    const AvailabilitySection = () => {
        const { isOpen, setIsOpen, ref } = useDropdown();
        const [data, setData] = useState(null);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState('');

        useEffect(() => {
            if (isOpen && !data && !loading) {
                setLoading(true);
                setError('');
                fetch('/api/vehicleAvailability')
                    .then(res => res.ok ? res.json() : Promise.reject('Gagal mengambil data.'))
                    .then(setData)
                    .catch((e) => setError(typeof e === 'string' ? e : e?.message || 'Gagal mengambil data.'))
                    .finally(() => setLoading(false));
            }
        }, [isOpen, data, loading]);

        const renderStatus = (count) =>
            Number(count) === 0
                ? <span style={{ color: 'red', fontWeight: 'bold' }}>Tidak tersedia</span>
                : count;

        return (
            <div className={styles.availabilitySection}>
                <div className={styles.availabilityLabel}>Availability</div>
                <div className={styles.availabilityDropdownWrap} ref={ref}>
                    <button
                        type="button"
                        className={styles.availabilityDropdownBtn}
                        onClick={() => setIsOpen(v => !v)}
                    >
                        Lihat Ketersediaan <span className={styles.availChevron}>▼</span>
                    </button>

                    {isOpen && (
                        <div className={styles.availabilityDropdown}>
                            {loading && <div>Loading...</div>}
                            {error && <div style={{ color: 'red', padding: 4 }}>{error}</div>}

                            {data && (
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Jenis</th>
                                            <th>Jumlah</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td>Driver</td>
                                            <td>{renderStatus(data.drivers)}</td>
                                        </tr>

                                        {Array.isArray(data.vehicles) && data.vehicles.map(v => (
                                            <tr key={v.type_id}>
                                                <td>{v.type_name}</td>
                                                <td>{renderStatus(v.available)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const closeSuccess = () => {
        setShowSuccess(false);
        router.push(`/User/OngoingBooking/bidrive/hal-orders?ns=${ns}`);
    };
    const handleLogout = async () => {
        try {
            const ns = new URLSearchParams(location.search).get('ns');
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ area: 'admin', ns }),
            });
        } catch { }
        router.replace('/Signin/hal-signAdmin');
    };

    return (
        <div className={styles.background}>
            <SidebarUser onLogout={() => setShowLogoutPopup(true)} />
            <main className={styles.mainContent}>
                <div className={styles.formBox}>
                    <div className={styles.topRow}>
                        <button className={styles.backBtn} onClick={() => router.back()} type="button">
                            <FaArrowLeft />
                        </button>
                        <div className={styles.logoDmoveWrapper}><Image src="/assets/D'MOVE.svg" alt="BI.DRIVE" width={180} height={85} priority /></div>
                        <AvailabilitySection />
                    </div>
                    <form className={styles.formGrid} autoComplete="off" onSubmit={handleSubmit}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}><label htmlFor="jumlahDriver">Jumlah Driver</label>
                                <input
                                    id="jumlahDriver"
                                    name="jumlahDriver"
                                    type="number"
                                    min="1"
                                    max={availabilityData?.drivers || undefined}
                                    value={fields.jumlahDriver}
                                    onChange={handleChange}
                                    className={errors.jumlahDriver ? styles.errorInput : ''}
                                    placeholder="Masukkan jumlah driver"
                                />
                                {errors.jumlahDriver && <span className={styles.errorMsg}>{errors.jumlahDriver}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="jenisKendaraan">Jenis Kendaraan</label>
                                <div className={`${styles.multiSelectBox} ${errors.jenisKendaraan ? styles.errorInput : ''}`} ref={vehicleDropdownRef} onClick={() => setVehicleDropdownOpen(open => !open)}>
                                    <span className={fields.jenisKendaraan.length ? styles.selectedText : styles.placeholder}>
                                        {isLoadingOptions ? 'Memuat...' : fields.jenisKendaraan.length ? fields.jenisKendaraan.map(v => `${v.name} (${v.quantity})`).join(', ') : 'Pilih Kendaraan'}
                                    </span>
                                    <span className={styles.chevron}>&#9662;</span>
                                    {isVehicleDropdownOpen && (
                                        <div className={styles.multiSelectDropdown}>
                                            {vehicleTypesOptions.map(option => {
                                                const selectedVehicle = fields.jenisKendaraan.find(item => item.id === option.id);
                                                const quantity = selectedVehicle ? selectedVehicle.quantity : 0;
                                                const maxForThisType = getMaxQuantity(option.id);
                                                return (
                                                    <div key={option.id} className={styles.quantityOption}>
                                                        <span>{option.name}</span>
                                                        <div className={styles.quantityControl}>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleQuantityChange(option, -1); }}
                                                                disabled={quantity === 0}>-</button>
                                                            <span>{quantity}</span>
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); handleQuantityChange(option, +1); }}
                                                                disabled={quantity >= maxForThisType}>+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                                {errors.jenisKendaraan && <span className={styles.errorMsg}>{errors.jenisKendaraan}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="tujuan">Tujuan</label>
                                <input id="tujuan" name="tujuan" type="text" value={fields.tujuan} onChange={handleChange} className={errors.tujuan ? styles.errorInput : ''} placeholder="cth: Kantor Pusat Jakarta" />
                                {errors.tujuan && <span className={styles.errorMsg}>{errors.tujuan}</span>}
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="jumlahOrang">Jumlah Orang</label>
                                <input id="jumlahOrang" name="jumlahOrang" type="number" min="1" value={fields.jumlahOrang} onChange={handleChange} className={errors.jumlahOrang ? styles.errorInput : ''} />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="jumlahKendaraan">Total Kendaraan</label>
                                <input id="jumlahKendaraan" name="jumlahKendaraan" type="number" value={fields.jumlahKendaraan} readOnly className={styles.readOnlyInput} />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="volumeBarang">Volume Barang (Kg)</label>
                                <input id="volumeBarang" name="volumeBarang" type="number" min="0" value={fields.volumeBarang} onChange={handleChange} className={errors.volumeBarang ? styles.errorInput : ''} />
                            </div>
                        </div>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="startDate">Start Date & Time</label>
                                <DatePicker id="startDate" selected={fields.startDate} onChange={(date) => handleDateChange(date, "startDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.startDate ? styles.errorInput : ''} minDate={new Date()} locale={idLocale} />
                                {errors.startDate && <span className={styles.errorMsg}>{errors.startDate}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="endDate">End Date & Time</label>
                                <DatePicker id="endDate" selected={fields.endDate} onChange={(date) => handleDateChange(date, "endDate")} showTimeSelect timeFormat="HH:mm" timeIntervals={15} dateFormat="dd MMMM yyyy HH:mm" timeCaption="Jam" className={errors.endDate ? styles.errorInput : ''} minDate={fields.startDate} locale={idLocale} />
                                {errors.endDate && <span className={styles.errorMsg}>{errors.endDate}</span>}
                            </div>
                        </div>

                        {/* --- PERBAIKAN TAMPILAN --- */}
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="noHp" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                                    <span>No HP</span>
                                    <button
                                        type="button"
                                        className={styles.myPhoneBtn}
                                        onClick={() => {
                                        if (myPhone) {
                                            setFields(prev => ({ ...prev, noHp: myPhone }));
                                            if (errors.noHp) setErrors(prev => ({ ...prev, noHp: null }));
                                        } else {
                                            alert('Nomor HP Anda tidak ditemukan di profil.');
                                        }
                                        }}
                                        disabled={!myPhone}
                                        title={myPhone ? `Isi dengan ${myPhone}` : 'Nomor HP tidak tersedia'}
                                    >
                                        Gunakan nomor HP saya
                                    </button>
                                </label>

                                <input
                                    id="noHp"
                                    name="noHp"
                                    type="text"
                                    value={fields.noHp}
                                    onChange={handleChange}
                                    className={errors.noHp ? styles.errorInput : ''}
                                    placeholder="Masukkan No HP"
                                    inputMode="tel"
                                    autoComplete="tel"
                                />
                                {errors.noHp && <span className={styles.errorMsg}>{errors.noHp}</span>}
                                </div>

                            {/* LINK FILE WAJIB + BINTANG MERAH (tanpa tautan 'Upload di Sini') */}
                            <div className={styles.formGroup}>
                                <label htmlFor="file_link">
                                    Link File <span aria-hidden="true" style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    id="file_link"
                                    name="file_link"
                                    type="text"
                                    value={fields.file_link}
                                    onChange={handleChange}
                                    className={errors.file_link ? styles.errorInput : ''}
                                    placeholder='Masukkan Link File'
                                    aria-required="true"
                                />
                                {errors.file_link && <span className={styles.errorMsg}>{errors.file_link}</span>}
                            </div>
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label htmlFor="keterangan">Keterangan Booking</label>
                                <textarea id="keterangan" name="keterangan" rows={2} value={fields.keterangan} onChange={handleChange} className={errors.keterangan ? styles.errorInput : ''} />
                            </div>
                        </div>

                        <div className={styles.buttonWrapper}>
                            <button type="submit" className={styles.bookingBtn} disabled={isSubmitting}>
                                {isSubmitting ? 'Memproses...' : 'Booking'}
                            </button>
                        </div>
                        {submitError && <div className={styles.submitErrorMsg}>{submitError}</div>}
                    </form>
                </div>
                {showSuccess && <SuccessPopup onClose={closeSuccess} />}
            </main>
            <LogoutPopup
                open={showLogoutPopup}
                onCancel={() => setShowLogoutPopup(false)}
                onLogout={handleLogout} />
        </div>
    );
}
