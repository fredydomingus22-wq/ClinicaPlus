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
    { label: 'TENANTS ACTIVE', value: isLoading ? '...' : data?.totalClinicas?.toString() || '0' },
    { label: 'DB CONNS', value: 'OK' }, // Mock stat representing typical sys admin dashboard
    { label: 'GLOBAL USERS', value: isLoading ? '...' : data?.totalUtilizadores?.toString() || '0', highlight: true },
    { label: 'TOTAL BOOKINGS', value: isLoading ? '...' : data?.totalAgendamentos?.toString() || '0' },
  ];

  return (
    <div className="flex items-center h-full font-mono text-[11px] uppercase tracking-wider overflow-hidden">
      <div className="hidden md:flex items-center gap-2 text-sa-text-muted pr-6 border-r border-white/10 mr-6">
        <span className="w-2 h-2 rounded-full bg-sa-primary shadow-[0_0_8px_color-mix(in_srgb,var(--sa-primary),transparent_20%)] animate-pulse" />
        SYS_ONLINE
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
        {time.toISOString().replace('T', ' ').substring(0, 19)} UTC
      </div>
    </div>
  );
}
