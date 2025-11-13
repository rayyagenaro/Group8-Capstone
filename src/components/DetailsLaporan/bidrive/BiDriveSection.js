// src/components/DetailsLaporan/bidrive/BiDriveSection.js
import React from 'react';
import { useState } from 'react';
import { FaFilePdf, FaWhatsapp } from 'react-icons/fa';
import FinishConfirmPopup from '@/components/FinishConfirmPopup/FinishConfirmPopup';

/**
 * Komponen presentational untuk BI-DRIVE (alias: dmove).
 * Tidak punya side-effect / fetch — semua aksi lewat props.
 */
export default function BiDriveSection({
  styles,
  booking,
  isUpdating,
  finishing,
  onRequestReject,
  onRequestApprove,
  onRequestCancel,
  isCancelling,
  onOpenKontak,
  onFinishBooking,
  STATUS_CONFIG,
  formatDateTime,
  formatDuration,
  getPlate,
  getStatusId,
}) {
  if (!booking) return <div className={styles.emptyText}>Data belum tersedia.</div>;
  const [showFinishPopup, setShowFinishPopup] = useState(false);

  const statusId = Number(
    typeof getStatusId === 'function' ? getStatusId(booking, null) : booking?.status_id
  );
  const info = STATUS_CONFIG[String(statusId || '1')];

  return (
    <div className={styles.detailCard} data-detail-root="bidrive">
      {/* ===== Header ===== */}
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>{`Booking BI-DRIVE | ${booking?.tujuan ?? '-'}`}</div>
          <div className={styles.headerMetaWrap}>
            <div className={styles.headerDates}>
              <div className={styles.metaRow}>
                <span className={styles.metaLabel}>TANGGAL PENGAJUAN</span>
                <span className={styles.metaValue}>{formatDateTime(booking?.created_at)}</span>
              </div>
              {statusId === 4 && (
                <div className={styles.metaRow}>
                  <span className={styles.metaLabel}>TANGGAL SELESAI</span>
                  <span className={styles.metaValue}>
                    {formatDateTime(booking?.finished_at || booking?.end_date || booking?.updated_at)}
                  </span>
                </div>
              )}
            </div>
            <span className={`${info.className} ${styles.headerStatus}`}>
              <span className={info.dot} /> {info.text}
            </span>
          </div>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className={styles.detailRow}>
        {/* Kiri */}
        <div className={styles.detailColLeft}>
          <div className={styles.detailLabel}>NAMA PENGAJU</div>
          <div className={styles.detailValue}>{booking?.user_name ?? '-'}</div>

          <div className={styles.detailLabel}>TUJUAN</div>
          <div className={styles.detailValue}>{booking?.tujuan ?? '-'}</div>

          <div className={styles.detailLabel}>KETERANGAN</div>
          <div className={styles.detailValue}>{booking?.keterangan || '-'}</div>

          {booking?.file_link && (
            <>
              <div className={styles.detailLabel}>FILE LAMPIRAN</div>
              <div className={styles.fileBox}>
                <FaFilePdf className={styles.fileIcon} />
                <a
                  href={booking.file_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.fileName}
                >
                  Lihat Lampiran
                </a>
              </div>
            </>
          )}

          {statusId === 3 && booking?.rejection_reason && (
            <div className={styles.rejectBox}>
              <div className={styles.rejectTitle}>Alasan Penolakan</div>
              <div className={styles.rejectText}>{booking.rejection_reason}</div>
            </div>
          )}
        </div>

        {/* Kanan */}
        <div className={styles.detailColRight}>
          <div className={styles.detailLabel}>JENIS KENDARAAN</div>
          <div className={styles.detailValue}>
            {Array.isArray(booking?.vehicle_types) && booking.vehicle_types.length
              ? booking.vehicle_types.map((v) => v.name).join(', ')
              : '-'}
          </div>

          <div className={styles.detailLabel}>DURASI PEMESANAN</div>
          <div className={styles.detailValue}>
            {formatDuration(booking?.start_date, booking?.end_date)}
          </div>

          {statusId === 4 && (
            <>
              <div className={styles.detailLabel}>TANGGAL SELESAI</div>
              <div className={styles.detailValue}>
                {formatDateTime(booking?.finished_at || booking?.updated_at)}
              </div>
            </>
          )}

          <div className={styles.detailLabel}>JUMLAH ORANG</div>
          <div className={styles.detailValue}>{booking?.jumlah_orang ?? '-'}</div>

          <div className={styles.detailLabel}>JUMLAH KENDARAAN</div>
          <div className={styles.detailValue}>
            {Array.isArray(booking?.vehicle_types) && booking.vehicle_types.length ? (
              <div>
                {booking.vehicle_types.map((v, i) => (
                  <div key={i}>
                    {v.name}: {v.quantity}
                  </div>
                ))}
              </div>
            ) : (
              '-'
            )}
          </div>

          <div className={styles.detailLabel}>JUMLAH DRIVER</div>
          <div className={styles.detailValue}>{booking?.jumlah_driver ?? '-'}</div>

          <div className={styles.detailLabel}>VOLUME BARANG</div>
          <div className={styles.detailValue}>
            {booking?.volume_kg ? `${booking.volume_kg} Kg` : '-'}
          </div>

          <div className={styles.detailLabel}>No HP</div>
          <div className={styles.detailValue}>{booking?.phone ?? '-'}</div>
        </div>
      </div>

      {/* Ditugaskan */}
      {[2, 4].includes(statusId) && (
        <div className={styles.detailRow} style={{ marginTop: 16 }}>
          <div className={styles.detailColLeft}>
            <div className={styles.detailLabel}>DRIVER DITUGASKAN</div>
            <div className={styles.detailValue}>
              {Array.isArray(booking?.assigned_drivers) && booking.assigned_drivers.length ? (
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  {booking.assigned_drivers.map((d) => (
                    <li key={d.id}>
                      {d.name || d.driver_name || '-'}
                      {d.phone ? ` — ${d.phone}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                'Belum ada data.'
              )}
            </div>
          </div>
          <div className={styles.detailColRight}>
            <div className={styles.detailLabel}>KENDARAAN DITUGASKAN</div>
            <div className={styles.detailValue}>
              {Array.isArray(booking?.assigned_vehicles) && booking.assigned_vehicles.length ? (
                <ul style={{ margin: 0 }}>
                  {booking.assigned_vehicles.map((v) => (
                    <li key={v.id}>
                      {getPlate(v)}
                      {v.type_name ? ` — ${v.type_name}` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                'Belum ada data.'
              )}
            </div>
          </div>
        </div>
      )}

      {/* Aksi status Pending */}
      {statusId === 1 && (
        <div
          className={styles.detailRow}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}
        >
          <button className={styles.btnTolak} onClick={onRequestReject} disabled={isUpdating}>
            {isUpdating ? 'Memproses...' : 'Tolak'}
          </button>
          <button className={styles.btnSetujui} onClick={onRequestApprove} disabled={isUpdating}>
            {isUpdating ? 'Memproses...' : 'Setujui'}
          </button>
        </div>
      )}

      {/* Aksi status Approved */}
      {statusId === 2 && (
        <div className={styles.actionBtnRow} style={{ gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.kirimPesanWrapper}>
            <button type="button" className={styles.btnKirimPesan} onClick={onOpenKontak}>
              <FaWhatsapp className={styles.waIcon} />
              <span>Kirim Pesan ke User dan Driver</span>
            </button>

            <p className={styles.kirimPesanNote}>
              Info: Kirim pesan otomatis kepada user dan driver untuk konfirmasi.
            </p>
          </div>

          {/* Tombol Cancel Booking (admin) */}
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onRequestCancel}
            disabled={isCancelling}
            title="Batalkan booking yang sudah disetujui"
          >
            {isCancelling ? 'Memproses...' : 'Batalkan Booking'}
          </button>

          {/* Tombol Finish Booking (admin) */}
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
      {/* Render Popup */}
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

    </div>
  );
}
