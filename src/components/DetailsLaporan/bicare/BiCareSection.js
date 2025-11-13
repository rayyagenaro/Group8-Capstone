import React from 'react';

export default function BiCareSection({
  styles, id, detail,
  formatDateOnly, formatDateTime, mapStatus,
}) {
  const status = mapStatus(detail);

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-CARE • Detail #{id}</div>
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
        <div className={styles.detailRow}>
          <div className={styles.detailColLeft}>
            <L styles={styles} label="ID" v={detail.id} />
            <L styles={styles} label="Dokter" v={detail.doctor_name || `ID ${detail.doctor_id || '-'}`} />
            <L styles={styles} label="Nama Pemesan" v={detail.booker_name || '-'} />
            <L styles={styles} label="NIP" v={detail.nip || '-'} />
            <L styles={styles} label="No WA" v={detail.wa || '-'} />
            <L styles={styles} label="Nama Pasien" v={detail.patient_name || '-'} />
            <L styles={styles} label="Status Pasien" v={detail.patient_status || '-'} />
            <L styles={styles} label="Jenis Kelamin" v={detail.jenis_kelamin || '-'} />
            <L styles={styles} label="Tanggal Lahir" v={formatDateOnly(detail.birth_date)} />
            <L styles={styles} label="Keluhan" v={detail.complaint || '-'} />
          </div>

          <div className={styles.detailColRight}>
            <L
              styles={styles}
              label="Tanggal Booking"
              v={`${formatDateOnly(detail.booking_date)} • ${String(detail.slot_time || '').slice(0, 5)}`}
            />
            <L styles={styles} label="Status" v={detail.status || '-'} />
            <L styles={styles} label="Created At" v={formatDateTime(detail.created_at)} />
          </div>
        </div>
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
