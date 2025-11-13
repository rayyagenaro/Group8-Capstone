// /src/pages/api/admin/detail/[slug].js
import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const rawSlug = String(req.query.slug || '').trim().toLowerCase();
  const SERVICE_ALIAS = {
    bicare: 'bicare',
    bimeet: 'bimeet',
    bistay: 'bistay',
    bimeal: 'bimeal',
    bidocs: 'bimail',
    docs: 'bimail',
    mail: 'bimail',
    bidrive: 'bidrive',
  };
  const service = SERVICE_ALIAS[rawSlug];

  const idParam = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;
  if (!idParam) return res.status(400).json({ error: 'Missing id' });
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  if (!service) {
    return res.status(400).json({ error: 'Layanan tidak dikenali', received: rawSlug });
  }

  try {
    let sql = '';
    let params = [id];

    switch (service) {

      case 'bidrive':
        sql = `
          SELECT 
            b.*, 
            u.name AS user_name, 
            u.phone
          FROM bidrive_bookings b
          LEFT JOIN users u ON u.id = b.user_id
          WHERE b.id = ? LIMIT 1
        `;
        break;

        case 'bicare':
          sql = `
            SELECT
              b.*,
              d.name AS doctor_name,
              j.jenis_kelamin  -- ✅ ambil nama gender
            FROM bicare_bookings b
            LEFT JOIN bicare_doctors d ON d.id = b.doctor_id
            LEFT JOIN jenis_kelamin j ON j.id = b.jenis_kelamin_id
            WHERE b.id = ? LIMIT 1
          `;
        break;


      case 'bimeet':
        sql = `
          SELECT
            b.*,
            r.name  AS room_name,
            r.floor AS room_floor,
            u.unit_kerja AS unit_kerja  -- ✅ ambil nama unit kerja
          FROM bimeet_bookings b
          LEFT JOIN bimeet_rooms r ON r.id = b.room_id
          LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
          WHERE b.id = ? LIMIT 1
        `;
      break;


      case 'bistay':
        sql = `SELECT b.* FROM bistay_bookings b WHERE b.id = ? LIMIT 1`;
        break;

      case 'bimeal':
        sql = `
          SELECT 
            b.id,
            b.user_id,
            b.nama_pic,
            b.nama_pic_tagihan,
            b.no_wa_pic,
            b.unit_kerja_id,
            u.unit_kerja,              -- ✅ ambil nama unit kerja
            b.waktu_pesanan,
            b.keterangan,
            b.lokasi_pengiriman,
            b.status_id,
            b.created_at
          FROM bimeal_bookings b
          LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
          WHERE b.id = ? LIMIT 1
        `;
        break;


      case 'bimail':
        sql = `
          SELECT
            d.id,
            d.user_id,
            d.jenis_id,
            d.tahun,
            d.nomor_urut,
            d.nomor_surat,
            d.tipe_dokumen,
            d.unit_code,
            d.wilayah_code,
            d.tanggal_dokumen,
            d.perihal,
            d.dari,
            d.kepada,
            d.link_dokumen,
            d.created_at
          FROM bimail_docs d
          WHERE d.id = ? LIMIT 1
        `;
        break;

      default:
        return res.status(400).json({ error: 'Layanan tidak dikenali' });
    }

    const [rows] = await db.query(sql, params);
    if (!rows.length) return res.status(404).json({ error: 'Data tidak ditemukan' });

    let item = rows[0];

    // ==== Special case BI.MEAL ====
    if (service === 'bimeal') {
      const [items] = await db.query(
        `SELECT id, nama_pesanan, jumlah, satuan
         FROM bimeal_booking_items
         WHERE booking_id = ?
         ORDER BY id ASC`,
        [id]
      );
      item = { ...item, items };
    }

    // ==== Special case BI.MAIL ====
    if (service === 'bimail') {
      const attachments = item.link_dokumen
        ? [{ name: 'Dokumen', url: item.link_dokumen }]
        : [];
      item = {
        ...item,
        mail_number: item.nomor_surat,
        mail_type: item.tipe_dokumen,
        mail_date: item.tanggal_dokumen,
        subject: item.perihal,
        from_name: item.dari,
        to_name: item.kepada,
        attachments,
        status_id: 4,          // selalu Finished
        status: 'Finished',
      };
    }

    // ==== Special case BI.CARE ====
    if (service === 'bicare') {
      item = {
        ...item,
        status_id: item.status === 'Finished' ? 4 : 1, // mapping enum ke numeric
        status: item.status,
      };
    }

    return res.status(200).json({ item });
  } catch (e) {
    console.error('detail-api error:', e);
    return res.status(500).json({
      error: 'Server error',
      message: e?.message,
      code: e?.code,
      sqlMessage: e?.sqlMessage,
      sqlState: e?.sqlState,
    });
  }
}
