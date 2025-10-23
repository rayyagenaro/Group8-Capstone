// src/pages/api/ketersediaanAdmin.js
import db from '@/lib/db';

/* ====================== helpers ====================== */
const pad2 = (n) => String(n).padStart(2, '0');
const toLocalYMD = (d) => {
  const dd = (d instanceof Date) ? d : new Date(d);
  return `${dd.getFullYear()}-${pad2(dd.getMonth() + 1)}-${pad2(dd.getDate())}`;
};

const fmtDate = (d) => {
  // selalu hasilkan YYYY-MM-DD (LOKAL, bukan UTC)
  try { return toLocalYMD(d); }
  catch { return String(d).slice(0, 10); }
};

const fmtTime = (t) => {
  // menerima "HH:MM" | "HH:MM:SS" | Date
  if (t instanceof Date) return t.toTimeString().slice(0, 5);
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

// generate jam mulai tiap sesi dari aturan sessions/day
function buildSlotsFromRule(startHHMM, endHHMM, sessionsPerDay) {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  const startMin = sh * 60 + sm;
  const endMin = eh * 60 + em;
  if (!sessionsPerDay || sessionsPerDay <= 0 || endMin <= startMin) return [];
  const block = Math.floor((endMin - startMin) / sessionsPerDay);
  const out = [];
  for (let i = 0; i < sessionsPerDay; i++) {
    const m = startMin + block * i;
    const hh = pad2(Math.floor(m / 60));
    const mm = pad2(m % 60);
    out.push(`${hh}:${mm}`);
  }
  return out;
}

// JS Date.getDay(): 0=Sun..6=Sat  → map ke kode aturan
const WEEKDAY_MAP = { 0:'SUN', 1:'MON', 2:'TUE', 3:'WED', 4:'THU', 5:'FRI', 6:'SAT' };

/* ===================================================== */

export default async function handler(req, res) {
  try {
    /* ========================= GET ========================= */
    if (req.method === 'GET') {
      const { type } = req.query;

      // ===== BI.DRIVE
      if (type === 'drivers') {
        const [rows] = await db.query(`
          SELECT d.id,
                d.nim,
                d.name,
                d.phone,
                d.driver_status_id
            FROM bidrive_drivers d
        ORDER BY d.id ASC
        `);
        return res.status(200).json({ success: true, data: rows });
      }

      if (type === 'driver_statuses') {
        const [rows] = await db.query(`
          SELECT id, status 
            FROM bidrive_driver_statuses
        ORDER BY id ASC
        `);
        return res.status(200).json({ success: true, data: rows });
      }


      if (type === 'vehicles') {
        const [rows] = await db.query(
          `SELECT v.id,
                  v.plat_nomor,
                  v.tahun,
                  v.vehicle_type_id,
                  t.name  AS vehicle_type_name,
                  v.vehicle_status_id,
                  s.name  AS vehicle_status_name
            FROM bidrive_vehicles v
        LEFT JOIN bidrive_vehicle_types t
              ON v.vehicle_type_id = t.id
        LEFT JOIN bidrive_vehicle_statuses s
              ON v.vehicle_status_id = s.id
        ORDER BY v.id ASC`
        );
        return res.status(200).json({ success: true, data: rows });
      }

      if (type === 'vehicle_types') {
        const [rows] = await db.query(
          'SELECT id, name FROM bidrive_vehicle_types ORDER BY id ASC'
        );
        return res.status(200).json({ success: true, data: rows });
      }

      if (type === 'vehicle_statuses') {
        const [rows] = await db.query(
          'SELECT id, name FROM bidrive_vehicle_statuses ORDER BY id ASC'
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
        const startDate = `${y}-${pad2(m)}-01`;
        const last = new Date(y, m, 0);
        const endDate = `${last.getFullYear()}-${pad2(last.getMonth() + 1)}-${pad2(last.getDate())}`;

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
          const dateKey = fmtDate(r.booking_date);   // LOKAL
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
      if (type === 'bimeet_rules') {
        const [rows] = await db.query(
          `SELECT id, room_id, weekday, start_time, end_time, sessions_per_day, is_active
             FROM bimeet_availability_rules
            ORDER BY room_id ASC, FIELD(weekday,'MON','TUE','WED','THU','FRI','SAT','SUN')`
        );
        return res.status(200).json({ success: true, data: rows });
      }
      if (type === 'bimeet_calendar') {
        const roomId  = Number(req.query.roomId || 0);
        const monthStr = String(req.query.month || '').trim(); // "YYYY-MM"
        if (!roomId || !/^\d{4}-\d{2}$/.test(monthStr)) {
          return res.status(400).json({ success: false, message: 'Param tidak valid' });
        }

        // range bulan (LOKAL 00:00 – 23:59)
        const [yy, mm] = monthStr.split('-').map(Number);
        const startDate = new Date(yy, mm - 1, 1);
        const endDate   = new Date(yy, mm, 0);

        // ambil aturan aktif
        const [rules] = await db.query(
          `SELECT weekday, start_time, end_time, sessions_per_day
             FROM bimeet_availability_rules
            WHERE room_id = ? AND is_active = 1`,
          [roomId]
        );

        // bangun slotMap per tanggal (pakai tanggal LOKAL)
        const slotMap = {};
        for (let d = new Date(startDate); d <= endDate; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
          const wd = WEEKDAY_MAP[d.getDay()]; // 'SUN'..'SAT'
          const hit = (rules || []).filter(r => r.weekday === wd);
          if (hit.length === 0) continue;

          const dateKey = toLocalYMD(d); // LOKAL!
          const list = [];
          for (const r of hit) {
            const start = fmtTime(r.start_time);
            const end   = fmtTime(r.end_time);
            const times = buildSlotsFromRule(start, end, Number(r.sessions_per_day || 0));
            list.push(...times);
          }
          if (list.length) slotMap[dateKey] = Array.from(new Set(list)).sort();
        }

        // ambil booking status_id=2 (Booked) pada range tsb — pakai LOKAL
        const startYMD = `${toLocalYMD(startDate)} 00:00:00`;
        const endYMD   = `${toLocalYMD(endDate)} 23:59:59`;
        const [rows] = await db.query(
          `SELECT start_datetime, title
             FROM bimeet_bookings
            WHERE room_id = ?
              AND status_id = 2
              AND start_datetime BETWEEN ? AND ?
            ORDER BY start_datetime`,
          [roomId, startYMD, endYMD]
        );

        const bookedMap = {};
        const adminBlocks = {};
        for (const r of (rows || [])) {
          const dt = new Date(r.start_datetime);
          const dateKey = toLocalYMD(dt); // LOKAL!
          const hhmm = fmtTime(dt);
          (bookedMap[dateKey] ||= []).push(hhmm);
          if (String(r.title) === 'ADMIN_BLOCK') {
            (adminBlocks[dateKey] ||= []).push(hhmm);
          }
        }

        return res.status(200).json({ success: true, slotMap, bookedMap, adminBlocks });
      }

      // ===== BI.DOCS
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
        await db.query('INSERT INTO bidrive_drivers (nim, name, phone, driver_status_id) VALUES (?, ?, ?, ?)', [nim, name, phone, 1]);
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
      if (type === 'bimeet_rules') {
        const { room_id, weekday, start_time, end_time, sessions_per_day = 1, is_active = 1 } = data;
        if (!room_id || !weekday || !start_time || !end_time) {
          return res.status(400).json({ success:false, message:'Data aturan tidak lengkap' });
        }
        await db.query(
          `INSERT INTO bimeet_availability_rules
             (room_id, weekday, start_time, end_time, sessions_per_day, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [Number(room_id), String(weekday), start_time, end_time, Number(sessions_per_day || 1), Number(is_active)?1:0]
        );
        return res.status(200).json({ success:true });
      }
      if (type === 'bimeet_calendar') {
        const { action, roomId, bookingDate } = data;
        let { slotTime } = data;

        if (!roomId || !bookingDate || !slotTime) {
          return res.status(400).json({ success: false, message: 'Data tidak lengkap' });
        }
        if (/^\d{2}:\d{2}$/.test(slotTime)) slotTime = `${slotTime}:00`;
        if (action !== 'block' && action !== 'unblock') {
          return res.status(400).json({ success: false, message: 'Aksi kalender tidak valid' });
        }

        // gabung ke "YYYY-MM-DD HH:MM:SS"
        const slotDT = `${bookingDate} ${slotTime}`;

        const conn = await db.getConnection();
        try {
          await conn.beginTransaction();

          const [rows] = await conn.query(
            `SELECT id, title, status_id
               FROM bimeet_bookings
              WHERE room_id = ? AND start_datetime = ?
              FOR UPDATE`,
            [roomId, slotDT]
          );

          if (action === 'block') {
            if (rows.length === 0) {
              // cari user sistem yang valid untuk FK
              let systemUserId = null;
              const [[u1]] = await conn.query('SELECT id FROM users WHERE id = 1 LIMIT 1');
              if (u1?.id) systemUserId = u1.id;
              else {
                const [[uAny]] = await conn.query('SELECT id FROM users ORDER BY id ASC LIMIT 1');
                systemUserId = uAny?.id || null;
              }
              if (!systemUserId) {
                await conn.rollback();
                return res.status(409).json({ success:false, message:'Tidak ada user untuk mencatat blok admin.' });
              }

              await conn.query(
                `INSERT INTO bimeet_bookings
                   (user_id, status_id, start_datetime, end_datetime, room_id,
                    unit_kerja, title, description, participants, contact_phone, pic_name,
                    created_at, updated_at)
                 VALUES (?, 2, ?, DATE_ADD(?, INTERVAL 90 MINUTE), ?, '-', 'ADMIN_BLOCK', '-', 0, '-', '-', NOW(), NOW())`,
                [systemUserId, slotDT, slotDT, roomId]
              );
              await conn.commit();
              return res.status(200).json({ success: true, message: 'Slot ditutup.' });
            }
            const existing = rows[0];
            if (existing.title === 'ADMIN_BLOCK') {
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
            if (existing.title === 'ADMIN_BLOCK') {
              await conn.query(`DELETE FROM bimeet_bookings WHERE id = ? AND title = 'ADMIN_BLOCK'`, [existing.id]);
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

      // ===== BI.DOCS
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
      if (type === 'bimeet_rules') {
        const { id, room_id, weekday, start_time, end_time, sessions_per_day = 1, is_active = 1 } = data;
        await db.query(
          'UPDATE bimeet_availability_rules SET room_id=?, weekday=?, start_time=?, end_time=?, sessions_per_day=?, is_active=?, updated_at=NOW() WHERE id=?',
          [Number(room_id), String(weekday), start_time, end_time, Number(sessions_per_day||1), Number(is_active)?1:0, id]
        );
        return res.status(200).json({ success:true });
      }

      // ===== BI.DOCS
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
      if (type === 'bimeet_rules') {
        await db.query('DELETE FROM bimeet_availability_rules WHERE id=?', [id]);
        return res.status(200).json({ success: true });
      }

      // ===== BI.DOCS
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
