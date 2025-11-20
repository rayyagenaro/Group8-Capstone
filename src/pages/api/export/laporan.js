// Export Excel untuk satu modul (pakai param ?module=...), format kolom mengikuti adapter.
// (Nanti mudah ditambah mode multi-sheet kalau kamu mau `module=all`.)
import db from '@/lib/db';
import { getAdapter, normalizeModule } from '@/server/laporan';

const toYMD = (d) => (d ? new Date(d).toISOString().slice(0, 10) : null);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }
  try {
    const ExcelJS = (await import('exceljs')).default;

    const mod = normalizeModule(req.query.module || '');
    const adapter = getAdapter(mod);
    if (!adapter) return res.status(400).json({ error: 'module tidak dikenali' });

    const fromY = toYMD(req.query.from);
    const toY   = toYMD(req.query.to);

    const { columns, rows } = await adapter.preview({ db, fromYMD: fromY, toYMD: toY });
    const meta = adapter.excel || { columns, dateKeys: [] };

    const wb = new ExcelJS.Workbook();
    wb.creator = 'BI ONE';
    const ws = wb.addWorksheet('Laporan');

    // kolom: No + kolom adapter
    ws.columns = [{ header: 'No', key: 'no', width: 6 }, ...meta.columns];
    rows.forEach((r, i) => ws.addRow({ no: i + 1, ...r }));

    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.autoFilter = { from: { row: 1, col: 1 }, to: { row: 1, col: ws.columnCount } };

    (meta.dateKeys || []).forEach((k) => {
      const col = ws.getColumn(k);
      if (col) col.numFmt = 'yyyy-mm-dd hh:mm';
    });

    const fname = `${(meta.filenamePrefix || mod)}_${fromY || 'all'}_${toY || 'all'}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) {
    console.error('export error:', e);
    return res.status(500).json({ error: 'internal error' });
  }
}
