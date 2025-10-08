// lib/role.js

/**
 * Normalisasi role agar konsisten di seluruh sistem.
 * Output hanya bisa: "super_admin", "admin_fitur", "user", atau null.
 */
export function normalizeRole(role) {
  const r = String(role || '').toLowerCase();
  if (['super_admin', 'superadmin', 'super-admin'].includes(r)) return 'super_admin';
  if (['admin_fitur', 'adminfitur', 'admin-fitur', 'admin'].includes(r)) return 'admin_fitur';
  if (r === 'user') return 'user';
  return r || null;
}

/**
 * Mapping role ke scope akses.
 * - super_admin → bisa semua admin area
 * - admin_fitur → terbatas pada fitur
 * - user → hanya area user
 */
export const ROLE_TO_SCOPE = {
  super_admin: ['admin'],
  admin_fitur: ['admin'],
  user: ['user'],
};
