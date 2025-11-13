import React, { useState } from 'react';
import FinishConfirmPopup from '@/components/FinishConfirmPopup/FinishConfirmPopup';

export default function BiMealSection({
  styles,
  id, 
  detail,
  formatDateTime, 
  mapStatus,
  onRequestCancel,
  isCancelling,
  onFinishBooking,
  finishing,
  onApproveGeneric,
  isUpdatingGeneric,
  approving,
  onRequestReject, // 🔹 baru
  rejecting,       // 🔹 baru
}) {
  const [showFinishPopup, setShowFinishPopup] = useState(false);
  const [showRejectPopup, setShowRejectPopup] = useState(false); // 🔹 popup tolak
  const [rejectMsg, setRejectMsg] = useState('Pesanan anda ditolak, silakan hubungi admin.'); // 🔹 default pesan

  const status = mapStatus(detail);
  const statusId = detail?.status_id;
  const slug = 'bimeal';

  const noWa = detail?.no_wa_pic || '';

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-MEAL • Detail #{id}</div>
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
              <L styles={styles} label="Nama PIC" v={detail.nama_pic || '-'} />
              <L styles={styles} label="Nama PIC Tagihan" v={detail.nama_pic_tagihan || '-'} />
              <L styles={styles} label="No. WA PIC" v={detail.no_wa_pic || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Waktu Pesanan" v={formatDateTime(detail.waktu_pesanan)} />
              <L styles={styles} label="Unit Kerja" v={detail.unit_kerja || '-'} />
              <L styles={styles} label="Status" v={status?.text || '-'} />
              <L styles={styles} label="Lokasi Pengiriman" v={detail.lokasi_pengiriman || '-'} />
              <L styles={styles} label="Keterangan" v={detail.keterangan || '-'} />
            </div>
          </div>

          <div className={styles.detailRow}>
            <div className={styles.detailColLeft}>
              <div className={styles.detailLabel}>Pesanan</div>
              <div className={styles.detailValue}>
                {Array.isArray(detail.items) && detail.items.length ? (
                  <ul style={{ margin: 0 }}>
                    {detail.items.map((it) => (
                      <li key={`${detail.id}-${it.nama_pesanan}`}>
                        {it.nama_pesanan} ({it.jumlah} {it.satuan || 'pcs'})
                      </li>
                    ))}
                  </ul>
                ) : ('-')}
              </div>
            </div>
          </div>

          {/* Aksi Booked → Approve / Tolak */}
          {statusId === 1 && (
            <div className={styles.actionBtnRow} style={{ gap: 12 }}>
              {/* Tombol Tolak */}
              <button
                type="button"
                className={styles.btnTolak}
                onClick={onRequestReject}   // ✅ cukup panggil handler
                disabled={!!isUpdatingGeneric}
                title="Tolak pesanan ini"
              >
                {isUpdatingGeneric ? 'Memproses...' : 'Tolak'}
              </button>

              {/* Tombol Setujui */}
              <button
                type="button"
                className={styles.btnSetujui}
                onClick={async () => {
                  try {
                    const ok = await onApproveGeneric?.(); // ✅ approve dulu
                    if (ok && detail?.id) {
                      // ✅ langsung buka nota di tab baru
                      window.open(`/api/nota/bimeal/${detail.id}`, '_blank');
                    }
                  } catch (err) {
                    console.error(err);
                    alert('Gagal menyetujui pesanan.');
                  }
                }}
                disabled={!!isUpdatingGeneric}
                title="Setujui pesanan ini"
              >
                {isUpdatingGeneric ? 'Memproses...' : 'Setujui'}
              </button>
            </div>
          )}



          {/* Aksi Approved → Cancel + Finish */}
          {statusId === 2 && (
            <div className={styles.actionBtnRow} style={{ gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={styles.btnTolak}
                onClick={onRequestCancel}
                disabled={isCancelling}
                title="Batalkan pesanan yang sudah disetujui"
              >
                {isCancelling ? 'Memproses...' : 'Batalkan Pesanan'}
              </button>

              <button
                type="button"
                className={styles.btnSetujui}
                onClick={() => setShowFinishPopup(true)}
                disabled={!!finishing}
                title="Tandai pesanan sebagai selesai"
              >
                {finishing ? 'Memproses...' : 'Finish Pesanan'}
              </button>
            </div>
          )}

          {/* Popup Konfirmasi Finish */}
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

          {/* Popup Konfirmasi Tolak */}
          {showRejectPopup && (
            <div className={styles.modalBackdrop}>
              <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>Tolak Pesanan #{detail.id}</h3>
                <textarea
                  className={styles.input}
                  rows={4}
                  value={rejectMsg}
                  onChange={(e) => setRejectMsg(e.target.value)}
                />
                <div className={styles.modalBtnGroup}>
                  <button
                    type="button"
                    className={styles.btnCancel}
                    onClick={() => setShowRejectPopup(false)}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    className={styles.btnTolak}
                    disabled={!!rejecting}
                    onClick={async () => {
                      await onRejectBooking?.(detail.id, rejectMsg);
                      setShowRejectPopup(false);
                      // buka WhatsApp dengan pesan
                      if (noWa) {
                        window.open(
                          `https://wa.me/${noWa.replace(/^0/, '62')}?text=${encodeURIComponent(rejectMsg)}`,
                          '_blank'
                        );
                      }
                    }}
                  >
                    {rejecting ? 'Memproses...' : 'Kirim & Tolak'}
                  </button>
                </div>
              </div>
            </div>
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
