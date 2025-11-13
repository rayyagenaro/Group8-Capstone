import db from '@/lib/db';
import PDFDocument from 'pdfkit';

export default async function handler(req, res) {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Missing id' });

  try {
    const [rows] = await db.query(
      `SELECT 
          b.id,
          b.nama_pic,
          b.no_wa_pic,
          b.unit_kerja_id,
          u.unit_kerja AS unit_kerja,
          b.waktu_pesanan,
          b.status_id,
          i.nama_pesanan,
          i.jumlah,
          i.satuan
        FROM bimeal_bookings b
        LEFT JOIN unit_kerja u ON u.id = b.unit_kerja_id
        LEFT JOIN bimeal_booking_items i ON i.booking_id = b.id
        WHERE b.id = ?
        `,
      [id]
    );

    if (!rows.length) return res.status(404).json({ error: 'Booking not found' });

    const booking = rows[0];
    const items = rows
      .map(r => ({ nama: r.nama_pesanan, jumlah: r.jumlah, satuan: r.satuan }))
      .filter(i => i.nama);

    // set header untuk PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=nota-bimeal-${id}.pdf`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    // ===== Header =====
    doc.fontSize(18).font('Helvetica-Bold').text('Nota Pesanan BI-MEAL', { align: 'center' });
    doc.moveDown();

    // ===== Info Booking =====
    doc.fontSize(12).font('Helvetica');
    doc.text(`Nama PIC      : ${booking.nama_pic}`);
    doc.text(`No. WA PIC    : ${booking.no_wa_pic}`);
    doc.text(`Unit Kerja    : ${booking.unit_kerja}`);
    doc.text(`Tanggal Pesan : ${new Date(booking.waktu_pesanan).toLocaleString('id-ID')}`);
    doc.moveDown();

    // ===== Tabel Pesanan =====
    doc.fontSize(13).font('Helvetica-Bold').text('Pesanan:', { underline: true });
    doc.moveDown(0.5);
    
    // Header tabel
    const startX = 50;
    const colWidths = { no: 40, nama: 300, jumlah: 80, satuan: 80 };
    let y = doc.y;

    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('No', startX, y, { width: colWidths.no, align: 'left' });
    doc.text('Nama Pesanan', startX + colWidths.no, y, { width: colWidths.nama, align: 'left' });
    doc.text('Jumlah', startX + colWidths.no + colWidths.nama, y, { width: colWidths.jumlah, align: 'center' });
    doc.text('Satuan', startX + colWidths.no + colWidths.nama + colWidths.jumlah, y, { width: colWidths.satuan, align: 'center' });

    doc.moveDown(0.5);
    y = doc.y;

    // Isi tabel
    doc.font('Helvetica').fontSize(12);
    items.forEach((it, idx) => {
      doc.text(String(idx + 1), startX, y, { width: colWidths.no, align: 'left' });
      doc.text(it.nama, startX + colWidths.no, y, { width: colWidths.nama, align: 'left' });
      doc.text(String(it.jumlah), startX + colWidths.no + colWidths.nama, y, { width: colWidths.jumlah, align: 'center' });
      doc.text(it.satuan || '-', startX + colWidths.no + colWidths.nama + colWidths.jumlah, y, { width: colWidths.satuan, align: 'center' });

      y += 20; // jarak antar baris

      // garis pemisah baris (opsional)
      doc.save(); // simpan state
      doc.opacity(0.2).moveTo(startX, y - 5)
        .lineTo(startX + colWidths.no + colWidths.nama + colWidths.jumlah + colWidths.satuan, y - 5)
        .stroke();
      doc.restore(); // kembalikan opacity ke normal
    });



    // ===== Footer =====
    doc.moveDown(2);
    doc.fontSize(10).font('Helvetica-Oblique').text('Terima kasih atas pemesanan Anda.', { align: 'center' });

    doc.end();
  } catch (err) {
    console.error('PDF Error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
