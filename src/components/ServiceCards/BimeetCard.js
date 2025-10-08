// /src/components/ServiceCards/BimeetCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function BimeetCard({ ns }) {
  const { data, err, loading } = useServiceCard(4); // BI Meet
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
