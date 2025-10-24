import React from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function DoctorsSection({ styles, loading, rows, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className={styles.addRow}>
        <button type="button" className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 6 }} /> Tambah Dokter
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr><th>ID</th><th>Nama</th><th>Aktif</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
            ) : rows.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.name}</td>
                <td>{d.is_active ? 'Ya' : 'Tidak'}</td>
                <td>
                  <button type="button" className={styles.btnAction} onClick={() => onEdit(d)} title="Edit"><FaEdit /></button>
                  <button type="button" className={styles.btnActionDelete} onClick={() => onDelete(d.id)} title="Delete"><FaTrash /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
