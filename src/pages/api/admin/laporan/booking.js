// Satu endpoint utama: /api/admin/laporan/booking?module=bi-care|bi-drive&from=YYYY-MM-DD&to=YYYY-MM-DD
import { handlePreview } from '@/server/laporan/handlers';
import { normalizeModule } from '@/server/laporan';

export default async function handler(req, res) {
  const mod = normalizeModule(req.query.module || '');
  if (!mod) return res.status(400).json({ error: 'Parameter "module" wajib' });
  return handlePreview({ req, res, moduleKey: mod });
}
