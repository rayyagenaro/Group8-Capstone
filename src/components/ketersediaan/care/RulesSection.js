import React, { useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function RulesSection({ styles, loading, rows, doctors, onAdd, onEdit, onDelete }) {
  const doctorMap = useMemo(() => {
    const m = {};
    for (const d of doctors) m[d.id] = d.name;
    return m;
  }, [doctors]);

  return (
    <>
      <div className={styles.addRow}>
        <button type="button" className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 6 }} /> Tambah Aturan
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th><th>Dokter</th><th>Hari</th><th>Mulai</th><th>Selesai</th><th>Slot (mnt)</th><th>Aktif</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{doctorMap[r.doctor_id] || r.doctor_id}</td>
                <td>{r.weekday}</td>
                <td>{String(r.start_time).slice(0,5)}</td>
                <td>{String(r.end_time).slice(0,5)}</td>
                <td>{r.slot_minutes}</td>
                <td>{r.is_active ? 'Ya' : 'Tidak'}</td>
                <td>
                  <button type="button" className={styles.btnAction} onClick={() => onEdit(r)} title="Edit"><FaEdit /></button>
                  <button type="button" className={styles.btnActionDelete} onClick={() => onDelete(r.id)} title="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
