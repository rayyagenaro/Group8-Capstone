// lib/fetchAvailability.js
import { getNs } from './ns';

/**
 * Helper fetch untuk ketersediaanAdmin.
 * - Otomatis tambahin ?ns=... (ambil dari router / localStorage).
 * - Selalu return JSON, atau lempar error kalau gagal.
 *
 * @param {object} router - Next.js router
 * @param {string} type   - tipe data (drivers, vehicles, bicare_doctors, dll)
 * @param {object} [options] - fetch options tambahan
 */
export async function fetchAvailability(router, type, options = {}) {
  if (!type) throw new Error('fetchKetersediaan butuh param type');

  const ns = getNs(router);
  const url = ns
    ? `/api/ketersediaanAdmin?type=${encodeURIComponent(type)}&ns=${encodeURIComponent(ns)}`
    : `/api/ketersediaanAdmin?type=${encodeURIComponent(type)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    ...options,
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`fetchKetersediaan error: ${res.status} ${res.statusText} - ${txt}`);
  }

  const json = await res.json();
  return json.data || []; // ✅ langsung balikin array data
}
