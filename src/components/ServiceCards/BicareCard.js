// /src/components/ServiceCards/BicareCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function BicareCard({ ns }) {
  const { data, err, loading } = useServiceCard(2); // BI Care
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
