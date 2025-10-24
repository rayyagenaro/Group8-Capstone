import React from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function RoomsSection({ styles, loading, rows, statusMap, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className={styles.addRow}>
        <button type="button" className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 6 }} /> Tambah Room
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr><th>ID</th><th>Nama Room</th><th>Lantai</th><th>Kapasitas</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
            ) : rows.map((r) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{r.floor}</td>
                <td>{r.capacity}</td>
                <td>{statusMap[r.status_id] || r.status_id}</td>
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
