import db from '@/lib/db';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { email, name, hp } = req.body;

  console.log('👉 Diterima:', { email, name, hp });

  if (!email || !name || !hp) {
    console.log('❌ Ada field kosong');
    return res.status(400).json({ message: 'Semua field harus diisi' });
  }

  try {
    const [result] = await db.execute(
      'UPDATE users SET name = ?, phone = ? WHERE email = ?', // ✅ Ganti hp → phone
      [name, hp, email]
    );

    console.log('✅ Result:', result);

    if (result.affectedRows === 0) {
      console.log('⚠️ Tidak ada row yang diupdate');
      return res.status(404).json({ message: 'Pengguna tidak ditemukan' });
    }

    return res.status(200).json({ message: 'Data berhasil diperbarui' });
  } catch (error) {
    console.error('🔥 ERROR SAAT UPDATE DATA:', error);
    return res.status(500).json({ message: 'Terjadi kesalahan saat update data' });
  }
}
