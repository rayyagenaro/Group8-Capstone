// src/components/ketersediaan/meet/RulesMeetSection.js
import React, { useMemo } from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function RulesMeetSection({ styles, loading, rows, rooms, onAdd, onEdit, onDelete }) {
  const roomMap = useMemo(() => {
    const m = {};
    for (const r of rooms) m[r.id] = r.name;
    return m;
  }, [rooms]);

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
              <th>ID</th>
              <th>Room</th>
              <th>Hari</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Sessions/Hari</th>
              <th>Aktif</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{roomMap[r.room_id] || r.room_id}</td>
                <td>{r.weekday}</td>
                <td>{String(r.start_time).slice(0,5)}</td>
                <td>{String(r.end_time).slice(0,5)}</td>
                <td>{r.sessions_per_day}</td>
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
