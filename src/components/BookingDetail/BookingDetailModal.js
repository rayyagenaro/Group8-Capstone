// src/components/BookingDetail/BookingDetailModal.js
import React, { useState, useEffect } from "react";
import { FaTimes, FaStar } from "react-icons/fa";
import styles from "@/views/history/history.module.css";
import FinishConfirmPopup from "../FinishConfirmPopup/FinishConfirmPopup";
import { useRouter } from "next/router";
import { NS_RE } from "@/lib/ns-server";

/* ===== util ===== */
const norm = (s) => String(s || "").trim().toLowerCase();
function resolveFeatureKey(booking) {
  if (booking?.feature_key) return booking.feature_key;
  const candidates = [
    booking?.service, booking?.service_name, booking?.service_code,
    booking?.feature, booking?.layanan, booking?.jenis_layanan, booking?.feature_name,
  ].map(norm).filter(Boolean);
  for (const raw of candidates) {
    const s = raw.replace(/\s+/g, "");
    if (s.includes("bi.drive") || s.includes("bidrive") || s === "drive") return "bidrive";
    if (s.includes("bi.care")  || s.includes("bicare")  || s === "care")  return "bicare";
    if (s.includes("bi.meal")  || s.includes("bimeal")  || s === "meal")  return "bimeal";
    if (s.includes("bi.meet")  || s.includes("bimeet")  || s === "meet")  return "bimeet";
    if (s.includes("bi.docs")  || s.includes("bimail")  || s === "docs")  return "bimail";
    if (s.includes("bi.stay")  || s.includes("bistay")  || s === "stay")  return "bistay";
  }
  return "unknown";
}
function featureLabelOf(booking) {
  switch (resolveFeatureKey(booking)) {
    case "bidrive": return "BI.Drive";
    case "bicare":  return "BI.Care";
    case "bimeal":  return "BI.Meal";
    case "bimeet":  return "BI.Meet";
    case "bimail":  return "BI.Docs";
    case "bistay":  return "BI.Stay";
    default:        return null;
  }
}
const formatDate = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.valueOf())) return String(d);
  return dt.toLocaleString("id-ID", { day:"numeric", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit" });
};
const formatDateOnly = (d) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.valueOf())) return String(d);
  return dt.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" });
};
const formatDuration = (start, end) => {
  if (!start || !end) return "-";
  const diff = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000*60*60*24));
  return `${diff || 1} Hari | ${formatDateOnly(start)} - ${formatDateOnly(end)}`;
};
const getPlate = (v) => v?.plate || v?.plat_nomor || v?.nopol || v?.no_polisi || String(v?.id ?? "-");

const STATUS_CONFIG = (s) => ({
  "1": { text: "Pending",  className: s.statusPending  || s.statusProcess },
  "2": { text: "Approved", className: s.statusApproved },
  "3": { text: "Rejected", className: s.statusRejected },
  "4": { text: "Finished", className: s.statusFinished },
  "5": { text: "Cancelled", className: s.statusCancelled },
});

// Admin-style
const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return String(dateString);
  return d.toLocaleString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

// pilih teks untuk judul header
const headerSubject = (booking) => {
  const key = resolveFeatureKey(booking);
  switch (key) {
    case "bimeet":
      // prioritas: title → room_name → tujuan → "-"
      return booking?.title || booking?.room_name || booking?.tujuan || "-";
    case "bimail":
      return booking?.perihal || booking?.tujuan || "-";
    case "bimeal":
      return (
        booking?.tujuan ||
        (booking?._raw_bimeal?.unit_kerja
          ? `Catering • ${booking._raw_bimeal.unit_kerja}`
          : "Catering")
      );
    case "bistay":
      return (
        booking?.tujuan ||
        (booking?._raw_bistay?.asal_kpw
          ? `Menginap • ${booking._raw_bistay.asal_kpw}`
          : "Menginap")
      );
    case "bicare":
      return (
        booking?.tujuan ||
        (booking?._raw_bicare?.doctor_id
          ? `Klinik Dokter #${booking._raw_bicare.doctor_id}`
          : "Klinik")
      );
    default:
      return booking?.tujuan || "-";
  }
};

/* ===== component ===== */
export default function BookingDetailModal({
  booking,
  feedback,          // optional, hanya BI.Drive
  onClose,
  onFinish,
  finishing,
  onOpenRating,      // <-- optional, dipakai khusus BI.Drive
}) {
  const router = useRouter();
  const ns = typeof router.query.ns === 'string' && NS_RE.test(router.query.ns) ? router.query.ns : '';
  // Show Popup sukses
  const [showSuccess, setShowSuccess] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  useEffect(() => {
    if (!booking) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [booking, onClose]);

  if (!booking) return null;

  const featureKey = resolveFeatureKey(booking);
  const featureLabel = featureLabelOf(booking);


  let statusInfo =
    (STATUS_CONFIG(styles))[booking.status_id] ||
    { text: "Unknown", className: styles.statusPending };

    if (featureKey === 'bicare' && booking.status?.toLowerCase() === 'booked') {
    statusInfo.text = 'Booked';
    }
  const isApproved = Number(booking.status_id) === 2;
  const isFinished = Number(booking.status_id) === 4;
  const isCancelled = Number(booking.status_id) === 5;
  const isRejected = Number(booking.status_id) === 3 && !!booking.rejection_reason;

  const SuccessPopup = () => (
    <div className={styles.popupOverlay} role="dialog" aria-modal="true">
      <div className={styles.popupBox}>
        <div className={styles.popupIcon}>
          <svg width="70" height="70" viewBox="0 0 70 70" aria-hidden="true">
            <circle cx="35" cy="35" r="35" fill="#7EDC89" />
            <polyline points="23,36 33,46 48,29" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div className={styles.popupMsg}><b>Finish Booking Berhasil!</b></div>
      </div>
    </div>
  );

  // validasi feedback (1..5)
  const ratingVal   = Number(feedback?.rating_overall);
  const hasFeedback =
    Number.isFinite(ratingVal) && ratingVal >= 1 && ratingVal <= 5;

  // optional: pastikan tags array
  const feedbackTags = Array.isArray(feedback?.tags) ? feedback.tags : [];

  // Keterangan header kiri → fallback per layanan
  const keteranganTop =
    booking?.keterangan ??
    booking?._raw_bimeal?.keterangan ??
    booking?._raw_bistay?.keterangan ??
    booking?.description ??                // BI.Meet
    booking?._raw_bicare?.keterangan ??
    "-";

  const showAssignments =
    featureKey === "bidrive" &&
    (Array.isArray(booking.assigned_drivers) || Array.isArray(booking.assigned_vehicles));

  const renderRatingStars = (val) => (
    <div className={styles.feedbackStars}>
      {Array.from({ length: 5 }).map((_, i) => (
        <FaStar
          key={i}
          className={i < val ? styles.starFilled : styles.starEmpty}
        />
      ))}
      <span className={styles.feedbackScore}>{val}/5</span>
    </div>
  );

  const handleFinish = async (booking) => {
    try {
      const result = await onFinish(booking);               // jalankan callback asli
      setShowSuccess(true);                  // munculkan popup sukses
      setTimeout(() => {
        setShowSuccess(false);
        router.push(`/User/History/hal-history?ns=${ns}`);             // redirect setelah 1.5 detik
      }, 1500);
    } catch (err) {
      console.error("Gagal menyelesaikan booking:", err);
    }
  };

  return (
    <>
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modalContent} ${styles.detailCard}`} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalCloseBtn} onClick={onClose} type="button" aria-label="Tutup">
          <FaTimes />
        </button>
        <div className={styles.modalScrollArea}>
        {/* Header */}
        <div className={styles.topRow}>
          <div className={styles.leftTitle}>
            <div className={styles.bookingTitle}>
              {`Booking ${featureLabel ? `${featureLabel} | ` : ""}${headerSubject(booking)}`}
            </div>
            <div className={styles.headerMetaWrap}>
              <div className={styles.headerDates}>
                {featureKey === 'bimail' ? (
                  <div className={styles.metaRow}>
                    <span className={styles.metaLabel}>TANGGAL PENOMORAN</span>
                    <span className={styles.metaValue}>{formatDate(booking?.tanggal_dokumen)}</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.metaRow}>
                      <span className={styles.metaLabel}>TANGGAL PENGAJUAN</span>
                      <span className={styles.metaValue}>{formatDate(booking?.created_at)}</span>
                    </div>
                    {isFinished && (
                      <div className={styles.metaRow}>
                        <span className={styles.metaLabel}>TANGGAL SELESAI</span>
                        <span className={styles.metaValue}>
                          {formatDate(booking?.finished_at || booking?.end_date || booking?.updated_at)}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              <span className={`${statusInfo.className} ${styles.headerStatus}`}>{statusInfo.text}</span>
            </div>
          </div>
        </div>

        {/* Body 2 kolom */}
        <div className={styles.detailRow}>
          {/* Kiri */}
          <div className={styles.detailColLeft}>

            {/* LEFT: spesifik layanan */}
            {featureKey === "bidrive" && (
              <>
                <div className={styles.detailLabel}>TUJUAN</div>
                <div className={styles.detailValue}>{booking?.tujuan ?? "-"}</div>

                <div className={styles.detailLabel}>JUMLAH ORANG</div>
                <div className={styles.detailValue}>{booking?.jumlah_orang ?? "-"}</div>

                {booking?.volume_kg != null && (
                  <>
                    <div className={styles.detailLabel}>VOLUME BARANG</div>
                    <div className={styles.detailValue}>{booking?.volume_kg ? `${booking.volume_kg} Kg` : "-"}</div>
                  </>
                )}

                <div className={styles.detailLabel}>No HP ANDA</div>
                <div className={styles.detailValue}>{booking?.phone ?? "-"}</div>

                <div className={styles.detailLabel}>KETERANGAN</div>
                <div className={styles.detailValue}>{keteranganTop || "-"}</div>
              </>
            )}

            {featureKey === "bimeal" && (
              <>
                <div className={styles.detailLabel}>NAMA PEMESAN</div>
                <div className={styles.detailValue}>{booking?._raw_bimeal?.nama_pic || "-"}</div>

                <div className={styles.detailLabel}>PIC TAGIHAN</div>
                <div className={styles.detailValue}>{booking?._raw_bimeal?.nama_pic_tagihan || "-"}</div>

                <div className={styles.detailLabel}>NO. WA PIC</div>
                <div className={styles.detailValue}>{booking?._raw_bimeal?.no_wa_pic || "-"}</div>

                <div className={styles.detailLabel}>UNIT KERJA</div>
                <div className={styles.detailValue}>
                  {booking?.unit_kerja || booking?._raw_bimeal?.unit_kerja || "-"}
                </div>
              </>
            )}

            {featureKey === "bimeet" && (
              <>
                <div className={styles.detailLabel}>RUANGAN</div>
                <div className={styles.detailValue}>{booking?.room_name || "-"}</div>

                <div className={styles.detailLabel}>JUDUL</div>
                <div className={styles.detailValue}>{booking?.title || "-"}</div>

                {/* {Number.isFinite(booking?.room_capacity ?? booking?.capacity) && (
                  <>
                    <div className={styles.detailLabel}>KAPASITAS RUANGAN</div>
                    <div className={styles.detailValue}>
                      {booking?.room_capacity ?? booking?.capacity} org
                    </div>
                  </>
                )} */}

                <div className={styles.detailLabel}>UNIT KERJA</div>
                <div className={styles.detailValue}>{booking?.unit_kerja || "-"}</div>

                {Number.isFinite(booking?.participants) && (
                  <>
                    <div className={styles.detailLabel}>JUMLAH PESERTA</div>
                    <div className={styles.detailValue}>{booking?.participants} org</div>
                  </>
                )}
              </>
            )}

            {featureKey === "bimail" && (
              <>
                <div className={styles.detailLabel}>NOMOR SURAT</div>
                <div className={styles.detailValue}>{booking?.nomor_surat || "-"}</div>

                <div className={styles.detailLabel}>TANGGAL DOKUMEN</div>
                <div className={styles.detailValue}>
                  {formatDate(booking?.tanggal_dokumen || booking?.start_date)}
                </div>

                <div className={styles.detailLabel}>TIPE DOKUMEN</div>
                <div className={styles.detailValue}>{booking?.tipe_dokumen || "-"}</div>

                <div className={styles.detailLabel}>UNIT CODE</div>
                <div className={styles.detailValue}>{booking?.unit_code || "-"}</div>

                <div className={styles.detailLabel}>WILAYAH</div>
                <div className={styles.detailValue}>{booking?.wilayah_code || "-"}</div>
              </>
            )}

            {featureKey === "bistay" && booking?._raw_bistay && (
              <>
                <div className={styles.detailLabel}>NAMA PEMESAN</div>
                <div className={styles.detailValue}>{booking._raw_bistay.nama_pemesan || "-"}</div>

                <div className={styles.detailLabel}>NIP</div>
                <div className={styles.detailValue}>{booking._raw_bistay.nip || "-"}</div>

                <div className={styles.detailLabel}>NO. WA</div>
                <div className={styles.detailValue}>{booking._raw_bistay.no_wa || "-"}</div>
              </>
            )}

            {featureKey === "bicare" && booking?._raw_bicare && (
              <>
                <div className={styles.detailLabel}>NAMA PEMESAN</div>
                <div className={styles.detailValue}>{booking._raw_bicare.booker_name}</div>

                <div className={styles.detailLabel}>NIP</div>
                <div className={styles.detailValue}>{booking._raw_bicare.nip}</div>

                <div className={styles.detailLabel}>NO. WA</div>
                <div className={styles.detailValue}>{booking._raw_bicare.wa}</div>

                <div className={styles.detailLabel}>Waktu </div>
                <div className={styles.detailValue}>
                  {String(booking._raw_bicare.slot_time || "").slice(0, 5)}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div className={styles.vDivider} aria-hidden="true" />

          {/* Kanan */}
          <div className={styles.detailColRight}>
            {featureKey === "bistay" && booking?._raw_bistay && (
              <>
                <div className={styles.detailLabel}>CHECK IN & OUT</div>
                <div className={styles.detailValue}>
                  {formatDate(booking._raw_bistay.check_in)} — {formatDate(booking._raw_bistay.check_out)}
                </div>

                <div className={styles.detailLabel}>ASAL KPW</div>
                <div className={styles.detailValue}>{booking._raw_bistay.asal_kpw || "-"}</div>

                <div className={styles.detailLabel}>STATUS PEGAWAI</div>
                <div className={styles.detailValue}>{booking._raw_bistay.status_pegawai || "-"}</div>

                {booking._raw_bistay.keterangan && (
                  <>
                    <div className={styles.detailLabel}>KETERANGAN</div>
                    <div className={styles.detailValue}>{booking._raw_bistay.keterangan}</div>
                  </>
                )}
              </>
            )}

            {featureKey === "bimail" && (
              <>
                <div className={styles.detailLabel}>PERIHAL</div>
                <div className={styles.detailValue}>{booking?.perihal || "-"}</div>

                <div className={styles.detailLabel}>DARI</div>
                <div className={styles.detailValue}>{booking?.dari || "-"}</div>

                <div className={styles.detailLabel}>KEPADA</div>
                <div className={styles.detailValue}>{booking?.kepada || "-"}</div>

                {booking?.link_dokumen && (
                    <>
                        <div className={styles.detailLabel}>DOKUMEN</div>
                        <div className={styles.detailValue}>
                        <a
                            href={booking.link_dokumen}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkDoc}   // ← tambahkan ini
                        >
                            Link Dokumen
                        </a>
                        </div>
                    </>
                )}
              </>
            )}

            {featureKey === "bimeet" && (
              <>
                <div className={styles.detailLabel}>PIC</div>
                <div className={styles.detailValue}>{booking?.pic_name || "-"}</div>

                <div className={styles.detailLabel}>KONTAK</div>
                <div className={styles.detailValue}>{booking?.contact_phone || "-"}</div>

                <div className={styles.detailLabel}>TANGGAL RAPAT</div>
                <div className={styles.detailValue}>
                {`${formatDateTime(booking?.start_date)} → ${formatDateTime(booking?.end_date)}`}
                </div>

                {booking?.description && (
                  <>
                    <div className={styles.detailLabel}>DESKRIPSI</div>
                    <div className={styles.detailValue}>{booking.description}</div>
                  </>
                )}
              </>
            )}

            {featureKey === "bicare" && booking?._raw_bicare && (
              <>
                <div className={styles.detailLabel}>PASIEN</div>
                <div className={styles.detailValue}>
                  {booking._raw_bicare.patient_name} ({booking._raw_bicare.patient_status})
                </div>

                <div className={styles.detailLabel}>GENDER</div>
                <div className={styles.detailValue}>{booking._raw_bicare.jenis_kelamin}</div>

                <div className={styles.detailLabel}>TANGGAL LAHIR</div>
                <div className={styles.detailValue}>{booking._raw_bicare.birth_date}</div>

                <div className={styles.detailLabel}>KELUHAN</div>
                <div className={styles.detailValue}>
                  {String(booking._raw_bicare.complaint || "")}
                </div>
              </>
            )}

            {featureKey === "bimeal" && (
              <>
                <div className={styles.detailLabel}>WAKTU ANTAR</div>
                <div className={styles.detailValue}>
                  {formatDate(booking?._raw_bimeal?.waktu_pesanan || booking?.start_date)}
                </div>

                <div className={styles.detailLabel}>LOKASI ANTAR</div>
                <div className={styles.detailValue}>{booking?._raw_bimeal?.lokasi_pengiriman || "-"}</div>

                {Array.isArray(booking?._raw_bimeal?.items) && booking._raw_bimeal.items.length > 0 && (
                  <>
                    <div className={styles.detailLabel}>ITEM PESANAN</div>
                    <div className={styles.detailValue}>
                      {booking._raw_bimeal.items.map((it, idx) => (
                        <div key={idx}>{it.item} — {it.qty} {it.unit || "pcs"}</div>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}

            {featureKey === "bidrive" && (
              <>
                <div className={styles.detailLabel}>DURASI PEMESANAN</div>
                <div className={styles.detailValue}>{formatDuration(booking?.start_date, booking?.end_date)}</div>
                
                <div className={styles.detailLabel}>JUMLAH DRIVER</div>
                <div className={styles.detailValue}>{booking?.jumlah_driver ?? '-'}</div>

                <div className={styles.detailLabel}>JENIS KENDARAAN</div>
                <div className={styles.detailValue}>
                  {Array.isArray(booking?.vehicle_types) && booking.vehicle_types.length
                    ? booking.vehicle_types.map((v) => v.name).join(", ")
                    : "-"}
                </div>

                <div className={styles.detailLabel}>JUMLAH KENDARAAN</div>
                <div className={styles.detailValue}>
                  {Array.isArray(booking?.vehicle_types) && booking.vehicle_types.length ? (
                    <div>
                      {booking.vehicle_types.map((v, i) => (
                        <div key={i}>{v.name}: {v.quantity}</div>
                      ))}
                    </div>
                  ) : "-"}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Rejected */}
        {isRejected && (
          <div className={styles.rejectBox} style={{ marginTop: 16 }}>
            <div className={styles.rejectTitle}>Alasan Penolakan</div>
            <div className={styles.rejectText}>{booking.rejection_reason}</div>
          </div>
        )}
        {isCancelled && (
          <div className={styles.rejectBox} style={{ marginTop: 16 }}>
            <div className={styles.rejectTitle}>Alasan Pembatalan</div>
            <div className={styles.rejectText}>{booking.rejection_reason}</div>
          </div>
        )}

        {/* BI.Drive assignments */}
        {showAssignments && (isApproved || isFinished) && (
          <div className={styles.detailRow} style={{ marginTop: 16 }}>
            <div className={styles.detailColLeft}>
              <div className={styles.detailLabel}>DRIVER DITUGASKAN</div>
              <div className={styles.detailValue}>
                {Array.isArray(booking.assigned_drivers) && booking.assigned_drivers.length ? (
                  <ul className={styles.assignedList}>
                    {booking.assigned_drivers.map((d) => (
                      <li key={d.id}>
                        {d.name || d.driver_name || "-"}{d.phone ? ` — ${d.phone}` : ""}
                      </li>
                    ))}
                  </ul>
                ) : "Belum ada data."}
              </div>
            </div>

            <div className={styles.vDivider} aria-hidden="true" />

            <div className={styles.detailColRight}>
              <div className={styles.detailLabel}>KENDARAAN DITUGASKAN</div>
              <div className={styles.detailValue}>
                {Array.isArray(booking.assigned_vehicles) && booking.assigned_vehicles.length ? (
                  <ul className={styles.assignedList}>
                    {booking.assigned_vehicles.map((v) => (
                      <li key={v.id}>{getPlate(v)}{v.type_name ? ` — ${v.type_name}` : ""}</li>
                    ))}
                  </ul>
                ) : "Belum ada data."}
              </div>
            </div>
          </div>
        )}

        {/* BI.Drive rating section */}
        {featureKey === "bidrive" && isFinished && (
          hasFeedback ? (
            <div className={styles.ratingArea}>
              <div className={styles.feedbackSummary}>
                <div className={styles.feedbackTitle}>Penilaian Anda</div>
                {renderRatingStars(ratingVal)}      {/* ✅ pakai angka valid */}
                {feedbackTags.length > 0 && (
                  <div className={styles.feedbackTags}>
                    {feedbackTags.map((t) => (
                      <span key={t} className={styles.tagChipReadonly}>{t}</span>
                    ))}
                  </div>
                )}
                {feedback?.comment_text && (
                  <div className={styles.feedbackComment}>“{feedback.comment_text}”</div>
                )}
              </div>
            </div>
          ) : (
            typeof onOpenRating === "function" && (
              <div className={styles.ratingArea}>
                <div className={styles.feedbackCta}>
                  <div className={styles.feedbackPrompt}>
                    Perjalanan Anda telah selesai. Bantu kami dengan memberikan penilaian.
                  </div>
                  <button type="button" className={styles.btnPrimary} onClick={onOpenRating}>
                    Beri Penilaian
                  </button>
                </div>
              </div>
            )
          )
        )}

        {/* Finish button (kecuali Care/Docs) */}
        {featureKey !== "bicare" && featureKey !== "bimail" && Number(booking.status_id) === 2 && (
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.finishButton}
              onClick={() => setIsConfirmOpen(true)}
              disabled={finishing}
              title="Tandai booking ini sudah selesai"
            >
              Finish Booking
            </button>
          </div>
        )}

        <FinishConfirmPopup
          show={isConfirmOpen}
          finishing={finishing}
          styles={styles}
          onCancel={() => setIsConfirmOpen(false)}
          onConfirm={() => {
            setIsConfirmOpen(false);
            onFinish(booking);
            handleFinish(booking);
          }}
        />
      </div>
    </div>
  </div>
  {showSuccess && (
      <SuccessPopup onClose={() => setShowSuccess(false)} />
  )}
  </>
  );
}
