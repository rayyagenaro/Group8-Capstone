// /src/components/ServiceCards/BistayCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function BistayCard({ ns }) {
  const { data, err, loading } = useServiceCard(6); // BI Stay
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
