import React, { useState, useEffect } from 'react';
import { useGlobalStats } from '../../../hooks/useSuperAdmin';

export function StatTicker() {
  const [time, setTime] = useState(new Date());
  const { data, isLoading } = useGlobalStats();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const stats = [
    { label: 'CLÍNICAS ATIVAS', value: isLoading ? '...' : data?.totalClinicas?.toString() || '0' },
    { label: 'BASE DE DADOS', value: 'ESTÁVEL' },
    { label: 'UTILIZADORES', value: isLoading ? '...' : data?.totalUtilizadores?.toString() || '0', highlight: true },
    { label: 'MARCAÇÕES TOTAIS', value: isLoading ? '...' : data?.totalAgendamentos?.toString() || '0' },
  ];

  return (
    <div className="flex items-center h-full font-mono text-[11px] uppercase tracking-wider overflow-hidden">
      <div className="hidden md:flex items-center gap-2 text-sa-text-muted pr-6 border-r border-sa-border mr-6">
        <span className="w-2 h-2 rounded-full bg-sa-primary shadow-[0_0_8px_color-mix(in_srgb,var(--sa-primary),transparent_20%)] animate-pulse" />
        SISTEMA_OPERACIONAL
      </div>
      
      <div className="flex items-center gap-8 whitespace-nowrap animate-[marquee_20s_linear_infinite] md:animate-none">
        {stats.map((stat) => (
          <div key={stat.label} className="flex gap-2">
            <span className="text-sa-text-muted">{stat.label}:</span>
            <span className={`font-bold ${stat.highlight ? 'text-sa-primary' : 'text-white'}`}>
              {stat.value}
            </span>
          </div>
        ))}
      </div>
      
      <div className="hidden lg:block ml-auto text-sa-text-muted">
        {new Intl.DateTimeFormat('pt-AO', {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone: 'Africa/Luanda'
        }).format(time)}
      </div>
    </div>
  );
}
