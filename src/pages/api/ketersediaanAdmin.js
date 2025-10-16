// src/pages/api/ketersediaanAdmin.js
import db from '@/lib/db';

const fmtDate = (d) => {
  try { return new Date(d).toISOString().slice(0, 10); }
  catch { return String(d).slice(0, 10); }
};
const fmtTime = (t) => String(t).slice(0, 5); // "HH:MM" dari TIME/HH:MM:SS

export default async function handler(req, res) {
  try {
    /* ========================= GET ========================= */
    if (req.method === 'GET') {
      const { type } = req.query;

      // ===== BI.DRIVE
      if (type === 'drivers') {
        const [rows] = await db.query(
          'SELECT id, nim, name, phone FROM bidrive_drivers ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'vehicles') {
        const [rows] = await db.query(
          'SELECT id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id FROM bidrive_vehicles ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }

      // ===== BI.CARE
      if (type === 'bicare_doctors') {
        const [rows] = await db.query(
          'SELECT id, name, is_active FROM bicare_doctors ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'bicare_rules') {
        const [rows] = await db.query(
          'SELECT id, doctor_id, weekday, start_time, end_time, slot_minutes, is_active FROM bicare_availability_rules ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'bicare_calendar') {
        const doctorId = Number(req.query.doctorId || 1);
        const monthStr = String(req.query.month || '').trim(); // "YYYY-MM"
        if (!doctorId || !/^\d{4}-\d{2}$/.test(monthStr)) {
          return res.status(400).json({ success: false, message: 'Param tidak valid' });
        }

        const [y, m] = monthStr.split('-').map(Number);
        const startDate = `${y}-${String(m).padStart(2, '0')}-01`;
        const last = new Date(y, m, 0);
        const endDate = `${last.getFullYear()}-${String(last.getMonth() + 1).padStart(2, '0')}-${String(last.getDate()).padStart(2, '0')}`;

        const [rows] = await db.query(
          `SELECT booking_date, slot_time, booker_name
             FROM bicare_bookings
            WHERE doctor_id = ?
              AND status = 'Booked'
              AND booking_date BETWEEN ? AND ?
            ORDER BY booking_date, slot_time`,
          [doctorId, startDate, endDate]
        );

        const bookedMap = {};
        const adminBlocks = {};
        for (const r of rows) {
          const dateKey = fmtDate(r.booking_date);
          const hhmm = fmtTime(r.slot_time);
          (bookedMap[dateKey] ||= []).push(hhmm);
          if (String(r.booker_name) === 'ADMIN_BLOCK') {
            (adminBlocks[dateKey] ||= []).push(hhmm);
          }
        }
        return res.status(200).json({ success: true, bookedMap, adminBlocks });
      }

      // ===== BI.MEET
      if (type === 'bimeet_rooms') {
        const [rows] = await db.query(
          'SELECT id, name, floor, capacity, status_id FROM bimeet_rooms ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'bimeet_room_status') {
        const [rows] = await db.query(
          'SELECT id, code, name FROM bimeet_room_status ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }

      // ===== BI.DOCS (baru)
      if (type === 'bimail_units') {
        const [rows] = await db.query(
          'SELECT id, code, name FROM bimail_units ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'bimail_jenis') {
        const [rows] = await db.query(
          'SELECT id, kode, nama FROM bimail_jenis ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }

      return res.status(400).json({ success: false, message: 'Type not valid' });
    }

    /* ========================= POST ========================= */
    if (req.method === 'POST') {
      const { type, ...data } = req.body;

      // ===== BI.DRIVE
      if (type === 'drivers') {
        const { nim, name, phone } = data;
        await db.query('INSERT INTO bidrive_drivers (nim, name, phone) VALUES (?, ?, ?)', [nim, name, phone]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        const { plat_nomor, tahun, vehicle_type_id, vehicle_status_id } = data;
        await db.query(
          'INSERT INTO bidrive_vehicles (plat_nomor, tahun, vehicle_type_id, vehicle_status_id) VALUES (?, ?, ?, ?)',
          [plat_nomor, tahun, vehicle_type_id, vehicle_status_id]
        );
        return res.status(200).json({ success: true });
      }

      // ===== BI.CARE
      if (type === 'bicare_doctors') {
        const { name, is_active = 1 } = data;
        await db.query(
          'INSERT INTO bicare_doctors (name, is_active, created_at) VALUES (?, ?, NOW())',
          [name, Number(is_active) ? 1 : 0]
        );
        return res.status(200).json({ success: true });
      }
      if (type === 'bicare_rules') {
        const { doctor_id, weekday, start_time, end_time, slot_minutes = 30, is_active = 1 } = data;
        await db.query(
          `INSERT INTO bicare_availability_rules
             (doctor_id, weekday, start_time, end_time, slot_minutes, is_active, created_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [doctor_id, weekday, start_time, end_time, slot_minutes, Number(is_active) ? 1 : 0]
        );
        return res.status(200).json({ success: true });
      }
      if (type === 'bicare_calendar') {
        const { action, doctorId, bookingDate } = data;
        let { slotTime } = data;

        if (!doctorId || !bookingDate || !slotTime) {
          return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }
        if (/^\d{2}:\d{2}$/.test(slotTime)) slotTime = `${slotTime}:00`;
        if (action !== 'block' && action !== 'unblock') {
          return res.status(400).json({ success: false, message: 'Aksi kalender tidak valid' });
        }

        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();

          const [rows] = await conn.query(
            `SELECT id, booker_name, status
               FROM bicare_bookings
              WHERE doctor_id = ? AND booking_date = ? AND slot_time = ?
              FOR UPDATE`,
            [doctorId, bookingDate, slotTime]
          );

          if (action === 'block') {
            if (rows.length === 0) {
              await conn.query(
                `INSERT INTO bicare_bookings
                   (doctor_id, booking_date, slot_time, status, booker_name, nip, wa, patient_name, patient_status, gender, birth_date, complaint, created_at)
                 VALUES (?, ?, ?, 'Booked', 'ADMIN_BLOCK', '-', '-', '-', '-', '-', '1970-01-01', NULL, NOW())`,
                [doctorId, bookingDate, slotTime]
              );
              await conn.commit();
              return res.status(200).json({ success: true, message: 'Slot ditutup.' });
            }
            const existing = rows[0];
            if (existing.booker_name === 'ADMIN_BLOCK') {
              await conn.commit();
              return res.status(200).json({ success: true, message: 'Slot sudah ditutup.' });
            } else {
              await conn.rollback();
              return res.status(409).json({ success: false, message: 'Slot sudah dibooking pengguna. Tidak dapat ditutup.' });
            }
          }

          if (action === 'unblock') {
            if (rows.length === 0) {
              await conn.commit();
              return res.status(200).json({ success: true, message: 'Tidak ada blok admin pada slot ini.' });
            }
            const existing = rows[0];
            if (existing.booker_name === 'ADMIN_BLOCK') {
              await conn.query(`DELETE FROM bicare_bookings WHERE id = ? AND booker_name = 'ADMIN_BLOCK'`, [existing.id]);
              await conn.commit();
              return res.status(200).json({ success: true, message: 'Slot dibuka kembali.' });
            } else {
              await conn.rollback();
              return res.status(409).json({ success: false, message: 'Slot ini dibooking pengguna. Tidak dapat dibuka dari admin.' });
            }
          }
        } catch (err) {
          try { await conn.rollback(); } catch {}
          throw err;
        } finally {
          conn.release();
        }
      }

      // ===== BI.MEET
      if (type === 'bimeet_rooms') {
        const { name, floor, capacity, status_id } = data;
        if (!name || floor === undefined || capacity === undefined || !status_id) {
          return res.status(400).json({ success: false, message: 'Data room tidak lengkap' });
        }
        await db.query(
          'INSERT INTO bimeet_rooms (name, floor, capacity, status_id) VALUES (?, ?, ?, ?)',
          [name, Number(floor), Number(capacity), Number(status_id)]
        );
        return res.status(200).json({ success: true });
      }

      // ===== BI.DOCS (baru)
      if (type === 'bimail_units') {
        const code = String(data.code || '').trim();
        const name = String(data.name || '').trim();
        if (!code || !name) return res.status(400).json({ success:false, message:'Kode & Nama wajib diisi' });
        try {
          await db.query('INSERT INTO bimail_units (code, name) VALUES (?, ?)', [code, name]);
          return res.status(200).json({ success:true });
        } catch (e) {
          if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success:false, message:'Kode unit sudah ada' });
          }
          throw e;
        }
      }
      if (type === 'bimail_jenis') {
        const kode = String(data.kode || '').trim();
        const nama = String(data.nama || '').trim();
        if (!kode || !nama) return res.status(400).json({ success:false, message:'Kode & Nama wajib diisi' });
        try {
          await db.query('INSERT INTO bimail_jenis (kode, nama) VALUES (?, ?)', [kode, nama]);
          return res.status(200).json({ success:true });
        } catch (e) {
          if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success:false, message:'Kode jenis sudah ada' });
          }
          throw e;
        }
      }

      return res.status(400).json({ success: false, message: 'Type not valid' });
    }

    /* ========================= PUT ========================= */
    if (req.method === 'PUT') {
      const { type, ...data } = req.body;

      // ===== BI.DRIVE
      if (type === 'drivers') {
        const { id, nim, name, phone } = data;
        await db.query('UPDATE bidrive_drivers SET nim=?, name=?, phone=? WHERE id=?', [nim, name, phone, id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        const { id, plat_nomor, tahun, vehicle_type_id, vehicle_status_id } = data;
        await db.query(
          'UPDATE bidrive_vehicles SET plat_nomor=?, tahun=?, vehicle_type_id=?, vehicle_status_id=? WHERE id=?',
          [plat_nomor, tahun, vehicle_type_id, vehicle_status_id, id]
        );
        return res.status(200).json({ success: true });
      }

      // ===== BI.CARE
      if (type === 'bicare_doctors') {
        const { id, name, is_active = 1 } = data;
        await db.query('UPDATE bicare_doctors SET name=?, is_active=? WHERE id=?', [name, Number(is_active) ? 1 : 0, id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'bicare_rules') {
        const { id, doctor_id, weekday, start_time, end_time, slot_minutes = 30, is_active = 1 } = data;
        await db.query(
          'UPDATE bicare_availability_rules SET doctor_id=?, weekday=?, start_time=?, end_time=?, slot_minutes=?, is_active=? WHERE id=?',
          [doctor_id, weekday, start_time, end_time, slot_minutes, Number(is_active) ? 1 : 0, id]
        );
        return res.status(200).json({ success: true });
      }

      // ===== BI.MEET
      if (type === 'bimeet_rooms') {
        const { id, name, floor, capacity, status_id } = data;
        await db.query(
          'UPDATE bimeet_rooms SET name=?, floor=?, capacity=?, status_id=? WHERE id=?',
          [name, Number(floor), Number(capacity), Number(status_id), id]
        );
        return res.status(200).json({ success: true });
      }

      // ===== BI.DOCS (baru)
      if (type === 'bimail_units') {
        const { id } = data;
        const code = String(data.code || '').trim();
        const name = String(data.name || '').trim();
        if (!id || !code || !name) return res.status(400).json({ success:false, message:'Data tidak lengkap' });
        try {
          await db.query('UPDATE bimail_units SET code=?, name=? WHERE id=?', [code, name, id]);
          return res.status(200).json({ success:true });
        } catch (e) {
          if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success:false, message:'Kode unit sudah ada' });
          }
          throw e;
        }
      }
      if (type === 'bimail_jenis') {
        const { id } = data;
        const kode = String(data.kode || '').trim();
        const nama = String(data.nama || '').trim();
        if (!id || !kode || !nama) return res.status(400).json({ success:false, message:'Data tidak lengkap' });
        try {
          await db.query('UPDATE bimail_jenis SET kode=?, nama=? WHERE id=?', [kode, nama, id]);
          return res.status(200).json({ success:true });
        } catch (e) {
          if (e?.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success:false, message:'Kode jenis sudah ada' });
          }
          throw e;
        }
      }

      return res.status(400).json({ success: false, message: 'Type not valid' });
    }

    /* ========================= DELETE ========================= */
    if (req.method === 'DELETE') {
      const { type, id } = req.body;

      // ===== BI.DRIVE
      if (type === 'drivers') {
        await db.query('DELETE FROM bidrive_drivers WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'vehicles') {
        await db.query('DELETE FROM bidrive_vehicles WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'bicare_doctors') {
        await db.query('DELETE FROM bicare_doctors WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'bicare_rules') {
        await db.query('DELETE FROM bicare_availability_rules WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }

      // ===== BI.MEET
      if (type === 'bimeet_rooms') {
        await db.query('DELETE FROM bimeet_rooms WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }

      // ===== BI.DOCS (baru)
      if (type === 'bimail_units') {
        await db.query('DELETE FROM bimail_units WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }
      if (type === 'bimail_jenis') {
        await db.query('DELETE FROM bimail_jenis WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }

      return res.status(400).json({ success: false, message: 'Type not valid' });
    }

    return res.status(405).json({ success: false, message: 'Method Not Allowed' });
  } catch (e) {
    console.error('ketersediaanAdmin error:', e);
    return res.status(500).json({ success: false, message: e.message || 'Internal Server Error' });
  }
}
