import React, { useState, useEffect, useMemo } from 'react';
import styles from './persetujuanPopup.module.css';
import { FaTimes } from 'react-icons/fa';

export default function PersetujuanPopup({
  show,
  onClose,
  onSubmit,
  detail,                 // booking: { jumlah_driver, keterangan, vehicle_types: [{id|type_id|vehicle_type_id, name, quantity}] }
  driverList = [],        // drivers: { id, name, phone?, driver_status_id|status_id|status }
  vehicleList = [],       // vehicles: { id, plat_nomor|plate, tahun, vehicle_type_id, vehicle_status_id|status_id|status }
}) {
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [keterangan, setKeterangan] = useState(detail?.keterangan || '');

  const maxDrivers = Number(detail?.jumlah_driver) || 0;

  // Kuota per tipe dari booking (robust ke id/type_id/vehicle_type_id)
  const requiredByType = useMemo(() => {
    const map = new Map();
    (detail?.vehicle_types || []).forEach((vt) => {
      const typeId = Number(vt.id ?? vt.type_id ?? vt.vehicle_type_id);
      if (Number.isFinite(typeId)) {
        map.set(typeId, Number(vt.quantity) || 0);
      }
    });
    return map;
  }, [detail]);

  // Total unit yang diminta
  const totalVehiclesRequired = useMemo(
    () => Array.from(requiredByType.values()).reduce((a, b) => a + b, 0),
    [requiredByType]
  );

  // Driver available
  const filteredDrivers = useMemo(
    () => (driverList || []).filter(
      (d) => Number(d.driver_status_id ?? d.status_id ?? d.status) === 1
    ),
    [driverList]
  );

  // Kendaraan available & sesuai tipe booking
  const allowedTypeIds = useMemo(() => {
    const ids = (detail?.vehicle_types || [])
      .map((vt) => Number(vt.id ?? vt.type_id ?? vt.vehicle_type_id))
      .filter(Number.isFinite);
    return new Set(ids);
  }, [detail]);

  const filteredVehicles = useMemo(
    () => (vehicleList || []).filter(
      (v) =>
        Number(v.vehicle_status_id ?? v.status_id ?? v.status) === 1 &&
        allowedTypeIds.has(Number(v.vehicle_type_id))
    ),
    [vehicleList, allowedTypeIds]
  );

  // Kelompokkan kendaraan per tipe
  const vehiclesByType = useMemo(() => {
    const map = new Map();
    filteredVehicles.forEach((v) => {
      const t = Number(v.vehicle_type_id);
      if (!map.has(t)) map.set(t, []);
      map.get(t).push(v);
    });
    map.forEach((arr) => arr.sort((a, b) => Number(a.id) - Number(b.id)));
    return map;
  }, [filteredVehicles]);

  // Hitung yang terpilih per tipe
  const selectedCountByType = useMemo(() => {
    const map = new Map();
    selectedVehicles.forEach((vid) => {
      const v = filteredVehicles.find((x) => Number(x.id) === Number(vid));
      if (!v) return;
      const t = Number(v.vehicle_type_id);
      map.set(t, (map.get(t) || 0) + 1);
    });
    return map;
  }, [selectedVehicles, filteredVehicles]);

  // Reset saat popup dibuka / detail berubah
  useEffect(() => {
    if (show) {
      setSelectedDrivers([]);
      setSelectedVehicles([]);
      setKeterangan(detail?.keterangan || '');
    }
  }, [show, detail]);

  // BUKAN hook: aman dipanggil sebelum/ setelah early return
  const selectedDriverNames =
    filteredDrivers
      .filter((d) => selectedDrivers.includes(Number(d.id)))
      .map((d) => d.name)
      .join(', ');

  // Early return SETELAH semua hook di atas
  if (!show) return null;

  // Toggle driver
  const handleDriverToggle = (id) => {
    const nid = Number(id);
    if (selectedDrivers.includes(nid)) {
      setSelectedDrivers((prev) => prev.filter((d) => d !== nid));
      return;
    }
    if (maxDrivers > 0 && selectedDrivers.length >= maxDrivers) {
      alert(`Maksimum driver yang bisa dipilih adalah ${maxDrivers}.`);
      return;
    }
    setSelectedDrivers((prev) => [...prev, nid]);
  };

  // Toggle kendaraan
  const handleVehicleToggle = (id) => {
    const nid = Number(id);
    const isSelected = selectedVehicles.includes(nid);
    if (isSelected) {
      setSelectedVehicles((prev) => prev.filter((v) => v !== nid));
      return;
    }

    if (selectedVehicles.length >= totalVehiclesRequired) {
      alert(`Maksimum kendaraan yang bisa dipilih adalah ${totalVehiclesRequired} unit.`);
      return;
    }

    const vehicle = filteredVehicles.find((v) => Number(v.id) === nid);
    if (!vehicle) return;

    const typeId = Number(vehicle.vehicle_type_id);
    const requiredForType = requiredByType.get(typeId) || 0;
    const selectedForType = selectedCountByType.get(typeId) || 0;

    if (selectedForType >= requiredForType) {
      const typeName =
        (detail?.vehicle_types || []).find(
          (vt) => Number(vt.id ?? vt.type_id ?? vt.vehicle_type_id) === typeId
        )?.name || `Tipe ${typeId}`;
      alert(`Kuota ${typeName} sudah terpenuhi (maks ${requiredForType}).`);
      return;
    }

    setSelectedVehicles((prev) => [...prev, nid]);
  };

  // Submit
  const handleSubmit = (e) => {
    e.preventDefault();

    if (totalVehiclesRequired > 0 && selectedVehicles.length !== totalVehiclesRequired) {
      alert(`Kamu harus memilih tepat ${totalVehiclesRequired} kendaraan.`);
      return;
    }
    if (maxDrivers > 0 && selectedDrivers.length !== maxDrivers) {
      alert(`Jumlah driver yang dipilih harus tepat ${maxDrivers}.`);
      return;
    }

    const driverObjs = filteredDrivers
      .filter((d) => selectedDrivers.includes(Number(d.id)))
      .map((d) => ({
        id: Number(d.id),
        name: d.name,
        phone: d.phone ?? null,
      }));

    const vehicleObjs = filteredVehicles
      .filter((v) => selectedVehicles.includes(Number(v.id)))
      .map((v) => ({
        id: Number(v.id),
        plat_nomor: v.plat_nomor ?? v.plate ?? String(v.id),
        vehicle_type_id: Number(v.vehicle_type_id),
        brand: v.brand ?? null,
        type_name:
          (detail?.vehicle_types || []).find(
            (t) => Number(t.id ?? t.type_id ?? t.vehicle_type_id) === Number(v.vehicle_type_id)
          )?.name ?? null,
      }));

    onSubmit({
      driverIds: selectedDrivers.map(Number),
      vehicleIds: selectedVehicles.map(Number),
      driverObjs,
      vehicleObjs,
      keterangan,
    });
  };

  const vehicleLabel = (v) => {
    const typeName =
      (detail?.vehicle_types || []).find(
        (t) => Number(t.id ?? t.type_id ?? t.vehicle_type_id) === Number(v.vehicle_type_id)
      )?.name || `Tipe ${v.vehicle_type_id}`;
    return `${v.plat_nomor ?? v.plate ?? v.id} — ${typeName}`;
  };

  const isVehicleDisabled = (v) => {
    const vid = Number(v.id);
    if (selectedVehicles.includes(vid)) return false; // boleh uncheck
    if (totalVehiclesRequired <= 0) return true;
    if (selectedVehicles.length >= totalVehiclesRequired) return true;
    const typeId = Number(v.vehicle_type_id);
    const requiredForType = requiredByType.get(typeId) || 0;
    const selectedForType = selectedCountByType.get(typeId) || 0;
    return selectedForType >= requiredForType;
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popupBox}>
        <div className={styles.popupHeader}>
          <div className={styles.popupTitle}>Persetujuan Form BI-DRIVE</div>
          <button className={styles.closeBtn} onClick={onClose}><FaTimes size={24} /></button>
        </div>

        <form className={styles.popupForm} onSubmit={handleSubmit}>
          {/* === 2 columns layout === */}
          <div className={styles.columns}>
            {/* LEFT: kendaraan (group by type) */}
            <div className={styles.col}>
              <label className={styles.formLabel}>
                Pilih Kendaraan{totalVehiclesRequired ? ` (butuh ${totalVehiclesRequired} unit)` : ''}
              </label>

              {(detail?.vehicle_types || []).map((t) => {
                const typeId = Number(t.id ?? t.type_id ?? t.vehicle_type_id);
                const list = vehiclesByType.get(typeId) || [];
                const required = requiredByType.get(typeId) || 0;
                const selectedForType = selectedCountByType.get(typeId) || 0;

                return (
                  <div key={typeId} className={styles.typeSection}>
                    <div className={styles.typeHeader}>
                      <span className={styles.typeTitle}>
                        {required} unit {t.name || `Tipe ${typeId}`}
                      </span>
                      <span className={styles.typeCounter}>
                        {selectedForType}/{required}
                      </span>
                    </div>

                    <div className={styles.scrollBox}>
                      {list.length === 0 && (
                        <div className={styles.emptyHintSmall}>
                          Tidak ada unit {t.name || `Tipe ${typeId}`} yang available.
                        </div>
                      )}
                      {list.map((vehicle) => (
                        <label key={vehicle.id} className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            value={vehicle.id}
                            checked={selectedVehicles.includes(Number(vehicle.id))}
                            onChange={() => handleVehicleToggle(Number(vehicle.id))}
                            className={styles.checkboxInput}
                            disabled={isVehicleDisabled(vehicle)}
                          />
                          <span>{vehicleLabel(vehicle)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* RIGHT: drivers */}
            <div className={styles.col}>
              <label className={styles.formLabel}>
                Pilih Driver{maxDrivers ? ` (Max ${maxDrivers})` : ''}
              </label>
              <div className={styles.scrollBox}>
                {filteredDrivers.length === 0 && (
                  <div className={styles.emptyHint}>Tidak ada driver yang available.</div>
                )}
                {filteredDrivers.map((driver) => (
                  <label key={driver.id} className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      value={driver.id}
                      checked={selectedDrivers.includes(Number(driver.id))}
                      onChange={() => handleDriverToggle(Number(driver.id))}
                      className={styles.checkboxInput}
                      disabled={
                        !selectedDrivers.includes(Number(driver.id)) &&
                        maxDrivers > 0 &&
                        selectedDrivers.length >= maxDrivers
                      }
                    />
                    <span>{driver.name}</span>
                  </label>
                ))}
              </div>

              {/* Nama Driver Terpilih */}
              <label className={styles.formLabel}>Driver Terpilih</label>
              <input
                className={styles.formInput}
                type="text"
                value={selectedDriverNames}
                readOnly
                placeholder="Driver"
              />
            </div>
          </div>

          {/* Keterangan + Submit */}
          <div className={styles.footerRow}>
            <div className={styles.keteranganCol}>
              <label className={styles.formLabel}>Keterangan</label>
              <input
                className={styles.formInput}
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Keterangan"
              />
            </div>
            <button type="submit" className={styles.submitBtn}>Submit</button>
          </div>
        </form>
      </div>
    </div>
  );
}
