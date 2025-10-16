// src/lib/fetchBookings.js
import { withNs } from "./ns";

const opts = (signal) => ({
  cache: "no-store",
  credentials: "include",
  signal,
});

/* ===================== Helper umum ===================== */
const mapBICareStatusToId = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "booked") return 2;
  if (s === "finished") return 4;
  if (s === "rejected" || s === "cancelled") return 3;
  return 1; // Pending default
};

// untuk jaga-jaga kalau ada date string “aneh”
const asISO = (d) => {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.valueOf()) ? null : t.toISOString();
};
const firstDate = (...vals) => vals.find((v) => !!asISO(v)) || null;

/* ===================== Normalisasi per layanan ===================== */
function normalizeBIDriveRow(row) {
  const start = firstDate(row.start_date, row.start_datetime, row.created_at);
  const end   = firstDate(row.end_date, row.end_datetime, row.start_date) || start;
  const created = firstDate(row.created_at, row.start_date, row.start_datetime, start);

  return {
    id: Number(row.id) || 0,
    feature_key: "bidrive",
    tujuan: row.tujuan || row.destination || "Perjalanan",
    start_date: start || new Date().toISOString(),
    end_date: end || start || new Date().toISOString(),
    created_at: created || start || new Date().toISOString(),
    finished_at: row.finished_at || null,
    status_id: row.status_id || 1,
    vehicle_types: row.vehicle_types || [],
    _raw_bidrive: row,
  };
}

function normalizeBICareRow(row) {
  // rakit start dari (booking_date + slot_time), default 30 menit
  const dateOnly = row?.booking_date
    ? (typeof row.booking_date === "string"
        ? row.booking_date.slice(0, 10)
        : new Date(row.booking_date).toISOString().slice(0, 10))
    : new Date().toISOString().slice(0, 10);

  const slot = (() => {
    const raw = String(row.slot_time || "00:00:00").slice(0, 8);
    return /^\d{2}:\d{2}(:\d{2})?$/.test(raw)
      ? (raw.split(":").length === 2 ? `${raw}:00` : raw)
      : "00:00:00";
  })();

  const startLocal = `${dateOnly}T${slot}`;
  const end = new Date(startLocal);
  end.setMinutes(end.getMinutes() + 30);

  return {
    id: `bicare-${row.id}`,
    feature_key: "bicare",
    tujuan: `Klinik Dokter #${row.doctor_id}`,
    start_date: asISO(startLocal) || new Date().toISOString(),
    end_date: end.toISOString(),
    created_at: firstDate(row.created_at, row.createdAt, startLocal) || new Date().toISOString(),
    finished_at: row.finished_at || null,
    status_id: mapBICareStatusToId(row.status),
    _raw_bicare: row,
  };
}

function normalizeBIMailRow(row) {
  const start = firstDate(row.tanggal_dokumen, row.created_at) || new Date().toISOString();
  const created = firstDate(row.created_at, row.tanggal_dokumen, start);

  return {
    id: `bimail-${row.id}`,
    feature_key: "bimail",
    tujuan: row.perihal || `Dokumen ${row.nomor_surat || ""}`.trim(),
    start_date: start,
    end_date: start,
    created_at: created || start,
    finished_at: start, // treat dokumen sebagai selesai pada tanggal dokumen
    status_id: 4,

    // kolom sesuai tabel
    nomor_surat: row.nomor_surat,
    tipe_dokumen: row.tipe_dokumen,
    unit_code: row.unit_code,
    wilayah_code: row.wilayah_code,
    tanggal_dokumen: row.tanggal_dokumen,
    perihal: row.perihal,
    dari: row.dari,
    kepada: row.kepada,
    link_dokumen: row.link_dokumen,

    _raw_bimail: row,
  };
}

function normalizeBIMealRow(row) {
  const start = firstDate(row.waktu_pesanan, row.created_at) || new Date().toISOString();
  const created = firstDate(row.created_at, row.waktu_pesanan, start);
  const items = Array.isArray(row.items) ? row.items : [];
  const totalQty = items.reduce((a, x) => a + (Number(x?.qty) || 0), 0);

  return {
    id: `bimeal-${row.id}`,
    feature_key: "bimeal",
    tujuan: row.unit_kerja ? `Catering • ${row.unit_kerja}` : "Catering",
    start_date: start,
    end_date: start,
    created_at: created || start,
    finished_at: row.finished_at || null,
    status_id: row.status_id || 1,
    _raw_bimeal: { ...row, items, total_qty: totalQty },
  };
}

function normalizeBIMeetRow(row) {
  const start = firstDate(row.start_date, row.created_at);
  const end   = firstDate(row.end_date, row.start_date) || start;
  const created = firstDate(row.created_at, row.createdAt, row.start_date, start);

  return {
    id: `bimeet-${row.id}`,
    feature_key: "bimeet",
    tujuan: row.title || `Meeting Room • ${row.room_name || row.room_id}`,
    start_date: start || new Date().toISOString(),
    end_date: end || start || new Date().toISOString(),
    created_at: created || start || new Date().toISOString(),
    finished_at: row.finished_at || null,
    status_id: row.status_id || 1,
    _raw_bimeet: row,
  };
}

function normalizeBIStayRow(row) {
  const start = firstDate(row.check_in, row.created_at);
  const end   = firstDate(row.check_out, row.check_in) || start;
  const created = firstDate(row.created_at, row.check_in, start);

  return {
    id: `bistay-${row.id}`,
    feature_key: "bistay",
    tujuan: row.asal_kpw ? `Menginap • ${row.asal_kpw}` : "Menginap",
    start_date: start || new Date().toISOString(),
    end_date: end || start || new Date().toISOString(),
    created_at: created || start || new Date().toISOString(),
    finished_at: row.finished_at || null,
    status_id: Number(row.status_id) || 1,
    _raw_bistay: row,
  };
}

/* ===================== Fetch All Services ===================== */
export async function fetchAllBookings(ns, scope = "user", abortSignal) {
  if (!ns) {
    console.warn("Session Error");
    return [];
  }

  const endpoints = [
    { service: "bidrive", url: `/api/booking?scope=${scope}`, normalize: normalizeBIDriveRow },

    {
      service: "bicare",
      url: `/api/BIcare/my-bookings?scope=${scope}`,
      normalize: normalizeBICareRow,
      arrKey: "bookings",
    },

    {
      service: "bimail",
      url: `/api/BImail?scope=${scope}`,
      normalize: normalizeBIMailRow,
      arrKey: "items",
    },

    {
      service: "bimeal",
      url: `/api/bimeal/book?scope=${scope}`,
      normalize: normalizeBIMealRow,
    },

    {
      service: "bimeet",
      url: `/api/bimeet/createbooking?scope=${scope}`,
      normalize: normalizeBIMeetRow,
      arrKey: "items",
    },

    {
      service: "bistay",
      url: `/api/BIstaybook/bistaybooking?scope=${scope}`,
      normalize: normalizeBIStayRow,
      arrKey: "data",
    },
  ];

  const parseArray = (payload, key) => {
    if (key && Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload)) return payload;
    if (payload && typeof payload === "object") return [payload];
    return [];
  };

  const results = await Promise.all(
    endpoints.map(async ({ service, url, normalize, arrKey }) => {
      try {
        const res = await fetch(withNs(url, ns), opts(abortSignal));
        const j = await res.json().catch(() => ({}));

        if (!res.ok)
          throw new Error(j?.reason || j?.error || `HTTP ${res.status}`);

        const rows = parseArray(j, arrKey);
        return rows.map(normalize);
      } catch (e) {
        console.warn(`${service} fetch error:`, e.message || e);
        return [];
      }
    })
  );

  // bisa sort by created_at agar urutan lebih “wajar”
  return results
    .flat()
    .sort((a, b) => new Date(b.created_at || b.start_date) - new Date(a.created_at || a.start_date));
}
