// /src/components/ServiceCards/DmoveCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function DmoveCard({ ns }) {
  const { data, err, loading } = useServiceCard(1); // BI Drive
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
