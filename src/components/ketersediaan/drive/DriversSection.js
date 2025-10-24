import React from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function DriversSection({
  styles, loading, rows, onAdd, onEdit, onDelete,
  onChangeStatus, updatingIds, statusOptions
}) {
  return (
    <>
      <div className={styles.addRow}>
        <button type="button" className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 6 }} /> Tambah Driver
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>No.</th><th>NIK</th><th>Nama</th><th>No. HP</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', color: '#aaa' }}>Data kosong</td></tr>
              ) : rows.map((d) => {
                const pending = updatingIds?.has?.(d.id);
                const value = Number(d.driver_status_id ?? 1);
                return (
              <tr key={d.id}>
                <td>{d.id}</td>

                <td>{d.nim}</td>
                
                <td>{d.name}</td>
                
                <td>{d.phone}</td>
                
                <td>
                  <select
                    className={styles.statusSelect}
                    value={value}
                    disabled={pending}
                    onChange={(e) => onChangeStatus?.(d.id, e.target.value)}
                    title={pending ? 'Menyimpan...' : 'Ubah status'}
                  >
                    {(statusOptions && statusOptions.length > 0
                      ? statusOptions
                      : [
                          { id: 1, name: 'Available' },
                          { id: 2, name: 'Unavailable' }
                        ]
                    ).map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.status}</option>
                    ))}
                  </select>
                </td>

                <td>
                  <button type="button" className={styles.btnAction} onClick={() => onEdit(d)} title="Edit" disabled={pending}><FaEdit /></button>
                  <button type="button" className={styles.btnActionDelete} onClick={() => onDelete(d.id)} title="Delete" disabled={pending}><FaTrash /></button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      )}
    </>
  );
}
