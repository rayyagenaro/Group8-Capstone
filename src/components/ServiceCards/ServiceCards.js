// /src/components/ServiceCards/ServicesCards.js
import React from 'react';
import styles from './ServiceCards.module.css';
import DmoveCard from './DmoveCard';
import BicareCard from './BicareCard';
import BimealCard from './BimealCard';
import BimeetCard from './BimeetCard';
import BidocsCard from './BidocsCard';
import BistayCard from './BistayCard';

// ⚠️ Pastikan ID ini sinkron dengan tabel `services` di DB-mu.
const SERVICE_DEFS = [
  { id: 1, slug: 'bidrive', Component: DmoveCard },
  { id: 2, slug: 'bicare',  Component: BicareCard },
  { id: 3, slug: 'bimeal',  Component: BimealCard },
  { id: 4, slug: 'bimeet',  Component: BimeetCard },
  { id: 5, slug: 'bidocs',  Component: BidocsCard },
  { id: 6, slug: 'bistay',  Component: BistayCard },
];

export default function ServicesCards({ ns, allowedServiceIds = null }) {
  // null -> super admin (semua). array -> filter. empty array -> none.
  const list = Array.isArray(allowedServiceIds)
    ? SERVICE_DEFS.filter(s => allowedServiceIds.includes(s.id))
    : SERVICE_DEFS;

  if (!list.length) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.empty}>
          Kamu belum diberi akses ke layanan apa pun. Hubungi super admin untuk pengaturan akses.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.cardsGrid}>
        {list.map(({ id, Component }) => (
          <Component key={id} ns={ns} />
        ))}
      </div>
    </div>
  );
}
