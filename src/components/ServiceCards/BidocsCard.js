// /src/components/ServiceCards/BidocsCard.jsx
import React from 'react';
import { useServiceCard } from './hooks/useServiceCard';
import CardShell from './CardShell';

export default function BidocsCard({ ns }) {
  const { data, err, loading } = useServiceCard(5); // BI Docs (bimail)
  return <CardShell ns={ns} data={data} err={err} loading={loading} />;
}
