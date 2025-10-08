// Lokasi: /src/components/Pagination/Pagination.js

import React from 'react';
import styles from './Pagination.module.css';

  const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    // Fungsi ini membuat array nomor halaman, termasuk elipsis (...)
    // Maksimal 3 ke kanan dari current
  const generatePageNumbers = () => {
    const pages = [];
    const maxRight = 3;

    // Kalau total sedikit, tampilkan semua
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
      return pages;
    }

    // Selalu tampilkan halaman 1
    pages.push(1);

    // Window kanan mulai dari current (min 2) sampai max 3 ke kanan
    const start = Math.max(2, currentPage);
    const end = Math.min(totalPages - 1, currentPage + maxRight - 1);

    // Elipsis sebelum window jika ada gap
    if (start > 2) pages.push('...');

    for (let i = start; i <= end; i++) pages.push(i);

    // Elipsis sesudah window jika masih jauh dari last
    if (end < totalPages - 1) pages.push('...');

    // Selalu tampilkan halaman terakhir
    pages.push(totalPages);

    return pages;
  };

  const pageNumbers = generatePageNumbers();

  // Jika hanya ada satu halaman, jangan tampilkan pagination sama sekali
  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={styles.pagination}>
      {/* Tombol Kembali (Previous) */}
      <button 
        onClick={() => onPageChange(currentPage - 1)} 
        disabled={currentPage === 1}
        className={styles.pageItem}
        aria-label="Halaman Sebelumnya"
      >
        &lt;
      </button>

      {/* Tombol Nomor Halaman */}
      {pageNumbers.map((page, index) =>
        typeof page === 'number' ? (
          <button
            key={index}
            onClick={() => onPageChange(page)}
            className={`${styles.pageItem} ${currentPage === page ? styles.active : ''}`}
          >
            {page}
          </button>
        ) : (
          <span key={index} className={styles.ellipsis}>...</span>
        )
      )}

      {/* Tombol Lanjut (Next) */}
      <button 
        onClick={() => onPageChange(currentPage + 1)} 
        disabled={currentPage === totalPages}
        className={styles.pageItem}
        aria-label="Halaman Berikutnya"
      >
        &gt;
      </button>
    </nav>
  );
};

export default Pagination;