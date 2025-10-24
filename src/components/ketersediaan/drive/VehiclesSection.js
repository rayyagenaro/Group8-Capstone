import React from 'react';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

export default function VehiclesSection({ styles, loading, rows, onAdd, onEdit, onDelete }) {
  return (
    <>
      <div className={styles.addRow}>
        <button type="button" className={styles.btnCreate} onClick={onAdd}>
          <FaPlus style={{ marginRight: 6 }} /> Tambah Vehicle
        </button>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', margin: 40 }}>Loading...</div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Plat Nomor</th>
              <th>Tahun</th>
              <th>Vehicle Type</th>
              <th>Vehicle Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', color: '#aaa' }}>
                  Data kosong
                </td>
              </tr>
            ) : (
              rows.map((v) => (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.plat_nomor}</td>
                  <td>{v.tahun}</td>
                  <td>{v.vehicle_type_name || v.vehicle_type_id}</td>
                  <td>{v.vehicle_status_name || v.vehicle_status_id}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.btnAction}
                      onClick={() => onEdit(v)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      type="button"
                      className={styles.btnActionDelete}
                      onClick={() => onDelete(v.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </>
  );
}
