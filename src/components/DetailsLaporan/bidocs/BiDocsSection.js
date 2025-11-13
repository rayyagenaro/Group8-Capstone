import React from 'react';

export default function BiMailSection({
  styles, id, detail,
  formatDateOnly, formatDateTime, mapStatus,
}) {
  const status = mapStatus(detail);

  return (
    <div className={styles.detailCard}>
      <div className={styles.topRow}>
        <div className={styles.leftTitle}>
          <div className={styles.bookingTitle}>BI-DOCS • Detail #{id}</div>
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
              <L styles={styles} label="Nomor Surat" v={detail.mail_number || detail.no_surat || '-'} />
              <L styles={styles} label="Jenis" v={detail.jenis ?? detail.jenis_id ?? '-'} />
              <L styles={styles} label="Tipe Dokumen" v={detail.mail_type || detail.tipe_dokumen || '-'} />
              <L styles={styles} label="Unit Kode" v={detail.unit_code ?? detail.unit_kode ?? '-'} />
              <L styles={styles} label="Wilayah Kode" v={detail.wilayah_code ?? detail.wilayah_kode ?? '-'} />
              <L styles={styles} label="Pengirim" v={detail.from_name || detail.sender_name || detail.sender_email || '-'} />
              <L styles={styles} label="Penerima" v={detail.to_name || detail.recipient_name || detail.recipient_email || '-'} />
              <L styles={styles} label="Perihal" v={detail.subject || detail.perihal || '-'} />
            </div>

            <div className={styles.detailColRight}>
              <L styles={styles} label="Tanggal Surat"
                 v={detail.mail_date ? formatDateOnly(detail.mail_date)
                   : detail.sent_at ? formatDateTime(detail.sent_at)
                   : '-'} />
              <div className={styles.detailLabel}>Link Dokumen (SharePoint)</div>
              <div className={styles.detailValue}>
                {Array.isArray(detail.attachments) && detail.attachments.length ? (
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    {detail.attachments.map((att, i) => (
                      <li key={i}>
                        {att?.url ? (
                          <a href={att.url} target="_blank" rel="noopener noreferrer"
                             style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
                            {att.name || 'Buka di SharePoint'}
                          </a>
                        ) : (att?.name || '-')}
                      </li>
                    ))}
                  </ul>
                ) : detail.link_dokumen ? (
                  <a href={detail.link_dokumen} target="_blank" rel="noopener noreferrer"
                     style={{ color: '#2563eb', textDecoration: 'underline', fontWeight: 500 }}>
                    Buka di SharePoint
                  </a>
                ) : ('-')}
              </div>
              <L styles={styles} label="Created At" v={detail.created_at ? formatDateTime(detail.created_at) : '-'} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function L({ styles, label, v }) { return (<><div className={styles.detailLabel}>{label}</div><div className={styles.detailValue}>{v}</div></>); }
