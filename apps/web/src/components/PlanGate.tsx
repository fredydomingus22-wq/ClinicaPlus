import React from 'react';
import { useClinicaMe } from '../hooks/useClinicas';
import { Plano, EstadoSubscricao, Papel } from '@clinicaplus/types';
import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { type SubscricaoActual } from '../hooks/useBilling';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { type ApiResponse } from '@clinicaplus/types';

const PLAN_ORDER: Record<Plano, number> = { 
  [Plano.BASICO]: 0, 
  [Plano.PRO]: 1, 
  [Plano.ENTERPRISE]: 2 
};

interface PlanGateProps {
  planoMinimo: 'PRO' | 'ENTERPRISE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Component to protect features based on the clinic's plan.
 */
export function PlanGate({ planoMinimo, children, fallback }: PlanGateProps) {
  const { data: clinica, isLoading } = useClinicaMe();

  if (isLoading) return null;
  if (!clinica) return null;

  const temAcesso = PLAN_ORDER[clinica.plano] >= PLAN_ORDER[planoMinimo];

  if (clinica.subscricaoEstado === EstadoSubscricao.SUSPENSA) {
    return <SubscricaoSuspensaBanner />;
  }

  if (!temAcesso) {
    return <>{fallback ?? <UpgradeBanner planoNecessario={planoMinimo} />}</>;
  }

  return <>{children}</>;
}

interface UpgradeBannerProps { 
  planoNecessario: 'PRO' | 'ENTERPRISE'; 
  feature?: string;
}

/**
 * Banner shown when a user tries to access a feature not included in their plan.
 */
export function UpgradeBanner({ planoNecessario, feature }: UpgradeBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/><path d="m9 14 3-3 3 3"/><path d="M12 21v-7"/></svg>
      </div>
      <h3 className="text-sm font-bold text-amber-900 uppercase tracking-wider font-mono">Funcionalidade Restrita</h3>
      <p className="mt-2 text-sm text-amber-700">
        {feature ? `A funcionalidade "${feature}"` : 'Esta funcionalidade'} requer o plano <strong>{planoNecessario}</strong>.
      </p>
      <NavLink
        to="/configuracoes/subscricao"
        className="mt-4 inline-flex items-center justify-center bg-amber-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-amber-700 transition-colors"
      >
        Ver planos e upgrade →
      </NavLink>
    </div>
  );
}

/**
 * Banner shown when the account is suspended.
 */
export function SubscricaoSuspensaBanner() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
      </div>
      <h3 className="text-sm font-bold text-red-900 uppercase tracking-wider font-mono">Conta Suspensa</h3>
      <p className="mt-2 text-sm text-red-700">
        A tua conta está suspensa devido a falta de pagamento. Apenas leitura disponível.
      </p>
      <NavLink
        to="/configuracoes/subscricao"
        className="mt-4 inline-flex items-center justify-center bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-700 transition-colors"
      >
        Regularizar subscrição →
      </NavLink>
    </div>
  );
}

interface UpgradeInlineProps {
  feature: string;
}

/**
 * Smaller, inline version of the upgrade prompt.
 */
export function UpgradeInline({ feature }: UpgradeInlineProps) {
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded text-[11px] font-medium text-amber-800">
      <div className="flex -space-x-1">
        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
      </div>
      <span>O recurso <strong>{feature}</strong> requer plano PRO.</span>
      <NavLink to="/configuracoes/subscricao" className="ml-2 font-bold underline hover:text-amber-900 transition-colors whitespace-nowrap">
        Upgrade →
      </NavLink>
    </div>
  );
}

/**
 * Global top-of-page banner for subscription status.
 */
export function SubscricaoStatusBanner() {
  const { utilizador } = useAuthStore();
  
  // IMPORTANT: We use a specific query here to avoid waiting for usage/history which aren't needed for the banner
  const { data: billing, isLoading } = useQuery<SubscricaoActual>({
    queryKey: ['subscricoes', 'actual'],
    queryFn: async () => {
      const response = await apiClient.get('/subscricoes/actual');
      return (response.data as ApiResponse<SubscricaoActual>).data!;
    },
    // Show for ADMIN and SUPER_ADMIN
    enabled: !!utilizador && [Papel.ADMIN, Papel.SUPER_ADMIN].includes(utilizador.papel)
  });

  if (!utilizador || !billing || isLoading) return null;
  
  // Only show for administrative roles
  if (![Papel.ADMIN, Papel.SUPER_ADMIN].includes(utilizador.papel)) return null;
  
  // Hide if subscription is active and in good standing
  if (billing.estado === EstadoSubscricao.ACTIVA) return null;

  const { estado, diasRestantes } = billing;

  if (estado === EstadoSubscricao.TRIAL && diasRestantes <= 7) {
    return (
      <div className="bg-[#1e40af] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-white animate-in slide-in-from-top duration-500">
        O teu período Trial termina em <span className="underline underline-offset-4">{diasRestantes} dias</span>.{' '}
        <NavLink to="/configuracoes/subscricao" className="ml-2 bg-white/20 px-2 py-0.5 hover:bg-white/30 transition-colors">Escolher plano agora</NavLink>
      </div>
    );
  }

  if (estado === EstadoSubscricao.GRACE_PERIOD) {
    return (
      <div className="bg-[#b45309] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-white animate-in slide-in-from-top duration-500">
        Subscrição expirada. Tens <span className="underline underline-offset-4">{diasRestantes} dias</span> para renovar antes da suspensão.{' '}
        <NavLink to="/configuracoes/subscricao" className="ml-2 bg-white/20 px-2 py-0.5 hover:bg-white/30 transition-colors font-black">Renovar agora</NavLink>
      </div>
    );
  }

  if (estado === EstadoSubscricao.SUSPENSA) {
    return (
      <div className="bg-[#991b1b] px-4 py-2 text-center text-[11px] font-bold uppercase tracking-widest text-white animate-in slide-in-from-top duration-500">
        Conta limitada (Apenas Leitura). Regulariza a subscrição para continuar.{' '}
        <NavLink to="/configuracoes/subscricao" className="ml-2 bg-white/20 px-2 py-0.5 hover:bg-white/30 transition-colors font-black">Regularizar</NavLink>
      </div>
    );
  }

  return null;
}
