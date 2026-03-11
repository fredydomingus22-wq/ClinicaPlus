import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Card } from './Card';
import { Spinner } from './Spinner';
import { cn } from '../utils/cn';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'blue' | 'amber' | 'green' | 'slate' | 'red';
  loading?: boolean;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  badgeText?: string;
  className?: string;
}

/**
 * Premium KPI Card for Dashboards.
 * Follows ClinicaPlus visual system tokens.
 */
export function KpiCard({ 
  label, 
  value, 
  icon: Icon, 
  color = 'blue', 
  loading = false,
  trend,
  badgeText = 'Estável',
  className
}: KpiCardProps) {
  const colorMap = {
    blue: { 
      bg: 'bg-[var(--estado-confirmado-bg)]',  
      icon: 'text-[var(--estado-confirmado-text)]',  
      num: 'text-[var(--color-primary-600)]',  
      badge: 'bg-[var(--estado-confirmado-bg)] text-[var(--estado-confirmado-text)]' 
    },
    amber: { 
      bg: 'bg-[var(--estado-pendente-bg)]', 
      icon: 'text-[var(--estado-pendente-text)]', 
      num: 'text-[var(--color-warning-700)]', 
      badge: 'bg-[var(--estado-pendente-bg)] text-[var(--estado-pendente-text)]' 
    },
    green: { 
      bg: 'bg-[var(--estado-em-progresso-bg)]', 
      icon: 'text-[var(--estado-em-progresso-text)]', 
      num: 'text-[var(--color-success-700)]', 
      badge: 'bg-[var(--estado-em-progresso-bg)] text-[var(--estado-em-progresso-text)]' 
    },
    slate: { 
      bg: 'bg-[var(--color-neutral-100)]', 
      icon: 'text-[var(--color-neutral-600)]', 
      num: 'text-[var(--color-neutral-900)]', 
      badge: 'bg-[var(--color-neutral-200)] text-[var(--color-neutral-700)]' 
    },
    red: { 
      bg: 'bg-[var(--estado-cancelado-bg)]',   
      icon: 'text-[var(--estado-cancelado-text)]',   
      num: 'text-[var(--color-danger-700)]',   
      badge: 'bg-[var(--estado-cancelado-bg)] text-[var(--estado-cancelado-text)]' 
    },
  };

  const styles = colorMap[color];

  return (
    <Card className={cn("p-5 relative", className)}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn("h-9 w-9 flex items-center justify-center shrink-0", styles.bg)}>
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div className={cn("px-2 py-0.5 text-[9px] font-bold font-mono uppercase tracking-widest", styles.badge)}>
           {badgeText}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-[9px] font-bold text-[#525252] uppercase tracking-[0.2em] font-mono leading-none mb-2">{label}</p>
        
        {loading ? (
          <div className="h-7 w-20 bg-[#f5f5f5] animate-pulse" />
        ) : (
          <div className="flex items-baseline gap-2">
            <h3 className={cn("text-2xl font-bold font-mono tabular-nums tracking-tight", styles.num)}>
              {typeof value === 'number' ? value.toLocaleString('pt-AO') : value}
            </h3>
            {trend && (
              <div className={cn(
                "flex items-center gap-0.5 text-[10px] font-bold font-mono px-1.5 py-0.5",
                trend.isPositive ? 'bg-[#f0fdf4] text-[#166534]' : 'bg-[#fef2f2] text-[#991b1b]'
              )}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}%
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
