// /pages/api/BIcare/book.js
import db from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

/* ===== utils ===== */
const to62 = (val) => {
  let p = String(val || '').replace(/[^\d]/g, '');
  if (!p) return null;
  if (p.startsWith('62')) return p.replace(/^620+/, '62');
  if (p.startsWith('0')) return '62' + p.slice(1);
  if (p.startsWith('8')) return '62' + p;
  return p;
};
const hhmmToHms = (t) => {
  const s = String(t || '').trim();
  if (/^\d{2}:\d{2}:\d{2}$/.test(s)) return s;
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':');
    return `${h.padStart(2, '0')}:${m}:00`;
  }
  return null;
};

/* ===== handler ===== */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  // pakai verifyAuth reusable
  const auth = await verifyAuth(req, ['user']);
  if (!auth.ok) {
    return res.status(401).json({ error: 'Unauthorized', reason: auth.reason });
  }
  const userId = auth.userId;

  let body = {};
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Body harus JSON' });
  }

  // Support camelCase dan snake_case
  const doctor_id       = body.doctor_id ?? body.doctorId;
  const booking_date    = body.booking_date ?? body.bookingDate; // "YYYY-MM-DD"
  const slot_time_in    = body.slot_time ?? body.slotTime;       // "HH:mm" / "HH:mm:ss"
  const booker_name     = body.booker_name ?? body.bookerName;
  const nip             = body.nip;
  const wa_in           = body.wa;
  const patient_name    = body.patient_name ?? body.patientName;
  const patient_status  = body.patient_status ?? body.patientStatus;
  const jenis_kelamin_id = body.jenis_kelamin_id ?? body.jenisKelaminId; // ✅ pakai ID integer
  const birth_date      = body.birth_date ?? body.birthDate ?? null;
  const complaint       = body.complaint ?? null;

  const slot_time = hhmmToHms(slot_time_in);
  const wa = to62(wa_in);

  // Validasi minimal
  const errors = {};
  if (!doctor_id) errors.doctor_id = 'doctor_id wajib';
  if (!booking_date) errors.booking_date = 'booking_date wajib';
  if (!slot_time) errors.slot_time = 'slot_time tidak valid';
  if (!booker_name) errors.booker_name = 'booker_name wajib';
  if (!nip) errors.nip = 'nip wajib';
  if (!wa) errors.wa = 'wa wajib';
  if (!patient_name) errors.patient_name = 'patient_name wajib';
  if (!patient_status) errors.patient_status = 'patient_status wajib';
  if (!jenis_kelamin_id) errors.jenis_kelamin_id = 'jenis_kelamin_id wajib';
  if (Object.keys(errors).length) {
    return res.status(422).json({ error: 'VALIDATION_ERROR', details: errors });
  }

  try {
    const [result] = await db.execute(
      `
      INSERT INTO bicare_bookings
        (user_id, doctor_id, booking_date, slot_time, status,
         booker_name, nip, wa,
         patient_name, patient_status,
         jenis_kelamin_id, birth_date, complaint, created_at)
      VALUES
        (?, ?, ?, ?, 'Booked',
         ?, ?, ?,
         ?, ?,
         ?, ?, ?, NOW())
      `,
      [
        userId,
        Number(doctor_id),
        booking_date,
        slot_time,
        String(booker_name),
        String(nip),
        String(wa),
        String(patient_name),
        String(patient_status),
        Number(jenis_kelamin_id), // ✅ pakai integer FK
        birth_date || null,
        complaint || null,
      ]
    );

    return res.status(201).json({ ok: true, id: result.insertId });
  } catch (e) {
    console.error('POST /api/BIcare/book error:', e?.message, e);
    return res.status(500).json({ error: 'INTERNAL_ERROR', details: e?.message });
  }
}
