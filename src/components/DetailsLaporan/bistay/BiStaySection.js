import React, { useState } from 'react';
import FinishConfirmPopup from '@/components/FinishConfirmPopup/FinishConfirmPopup';

// statusPegawaiList adalah prop baru yang berisi array data status
// Contoh: [{ id: 1, status: 'Pegawai' }, { id: 2, status: 'Pensiun' }]
export default function BiStaySection({
  styles, id, detail,
  formatDateTime, mapStatus,
  isPendingGeneric, isUpdatingGeneric,
  onRequestReject, onApproveGeneric,
  onRequestCancel,   // <-- baru
  isCancelling,      // <-- baru
  onFinishBooking,   // <-- baru
  finishing,         // <-- baru
  statusPegawaiList, // <-- daftar status pegawai
}) {
  const [showFinishPopup, setShowFinishPopup] = useState(false);

  const status = mapStatus(detail);
  const slug = 'bistay';

  // Fungsi untuk mencari nama status pegawai berdasarkan ID
  const getStatusPegawaiText = (statusId) => {
    if (!statusPegawaiList || !statusId) return '-';
    const foundStatus = statusPegawaiList.find(s => s.id === statusId);
    return foundStatus ? foundStatus.status : `ID (${statusId}) tidak ditemukan`;
  };

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-STAY • Detail #{id}</div>
          {status && (
            <span className={`${status.className} ${styles.headerStatus}`}>
              <span className={status.dot} /> {status.text}
            </span>
          )}
        </div>
      </div>

      {!detail ? (
        <div className={styles.emptyText}>Data belum tersedia.</div>
      ) : (
        <>
          <div className={styles.detailRow}>
            <div className={styles.detailColLeft}>
              <L styles={styles} label="ID" v={detail.id} />
              <L styles={styles} label="Nama Pemesan" v={detail.nama_pemesan || '-'} />
              <L styles={styles} label="NIP" v={detail.nip || '-'} />
              <L styles={styles} label="No WA" v={detail.no_wa || '-'} />
              <L styles={styles} label="Status Pegawai" v={getStatusPegawaiText(detail.status_pegawai_id)} />
              <L styles={styles} label="Asal KPw" v={detail.asal_kpw || '-'} />
              <L styles={styles} label="Keterangan" v={detail.keterangan || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Jadwal"
                v={`${formatDateTime(detail.check_in)} → ${formatDateTime(detail.check_out)}`} />
              <L styles={styles} label="Created At" v={formatDateTime(detail.created_at)} />
              <L styles={styles} label="Updated At" v={formatDateTime(detail.updated_at)} />
            </div>
          </div>

          {/* Aksi Pending */}
          {isPendingGeneric(slug, detail) && (
            <div className={styles.actionBtnRow} style={{ marginTop: 16 }}>
              <button className={styles.btnTolak} onClick={onRequestReject} disabled={isUpdatingGeneric}>
                {isUpdatingGeneric ? 'Memproses...' : 'Tolak'}
              </button>
              <button className={styles.btnSetujui} onClick={onApproveGeneric} disabled={isUpdatingGeneric}>
                {isUpdatingGeneric ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          )}

          {/* Aksi Approved */}
          {Number(detail?.status_id) === 2 && (
            <div className={styles.actionBtnRow} style={{ marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
              {/* Cancel */}
              <button
                type="button"
                className={styles.btnTolak}
                onClick={onRequestCancel}
                disabled={isCancelling}
                title="Batalkan booking"
              >
                {isCancelling ? 'Memproses...' : 'Batalkan Booking'}
              </button>

              {/* Finish */}
              <button
                type="button"
                className={styles.btnSetujui}
                onClick={() => setShowFinishPopup(true)}
                disabled={!!finishing}
                title="Tandai booking sebagai selesai"
              >
                {finishing ? 'Memproses...' : 'Finish Booking'}
              </button>
            </div>
          )}

          {/* Popup konfirmasi finish */}
          {showFinishPopup && (
            <FinishConfirmPopup
              show={showFinishPopup}
              styles={styles}
              finishing={finishing}
              onCancel={() => setShowFinishPopup(false)}
              onConfirm={() => {
                setShowFinishPopup(false);
                onFinishBooking();
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function L({ styles, label, v }) {
  return (
    <>
      <div className={styles.detailLabel}>{label}</div>
      <div className={styles.detailValue}>{v}</div>
    </>
  );
}
