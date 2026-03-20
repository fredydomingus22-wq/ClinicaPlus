import React from 'react';
import { EstadoFatura } from '@clinicaplus/types';
import { Badge, type BadgeVariant } from '@clinicaplus/ui';

const FATURA_STATUS_CONFIG: Record<EstadoFatura, { label: string; variant: BadgeVariant }> = {
  RASCUNHO: { label: 'Rascunho', variant: 'neutral' },
  EMITIDA:  { label: 'Emitida',  variant: 'info' },
  PAGA:     { label: 'Paga',     variant: 'success' },
  ANULADA:  { label: 'Anulada',  variant: 'error' },
};

interface FaturaStatusBadgeProps {
  estado: EstadoFatura;
  className?: string;
}

export function FaturaStatusBadge({ estado, className = '' }: FaturaStatusBadgeProps) {
  const config = FATURA_STATUS_CONFIG[estado];
  if (!config) return null;

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
