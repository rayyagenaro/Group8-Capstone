// /src/components/ServiceCards/BimealCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function BimealCard({ ns }) {
  const { data, err, loading } = useServiceCard(3); // BI Meal
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
