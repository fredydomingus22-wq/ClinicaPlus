// apps/web/src/components/PlanGate.tsx
// Componente pronto a usar — copia para o projecto

import { differenceInDays } from 'date-fns';
import { useAuthStore } from '../stores/auth.store';

type Plano = 'BASICO' | 'PRO' | 'ENTERPRISE';
const PLAN_ORDER: Record<Plano, number> = { BASICO: 0, PRO: 1, ENTERPRISE: 2 };

interface PlanGateProps {
  planoMinimo: 'PRO' | 'ENTERPRISE';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PlanGate({ planoMinimo, children, fallback }: PlanGateProps) {
  const { clinica } = useAuthStore();
  const temAcesso = PLAN_ORDER[clinica.plano as Plano] >= PLAN_ORDER[planoMinimo];
  if (clinica.subscricaoEstado === 'SUSPENSA') return <SubscricaoSuspensaBanner />;
  if (!temAcesso) return <>{fallback ?? <UpgradeBanner planoNecessario={planoMinimo} />}</>;
  return <>{children}</>;
}

interface UpgradeBannerProps { planoNecessario: 'PRO' | 'ENTERPRISE'; }

export function UpgradeBanner({ planoNecessario }: UpgradeBannerProps) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
      <p className="text-sm font-medium text-amber-800">
        Esta funcionalidade requer o plano <strong>{planoNecessario}</strong>.
      </p>
      <a
        href="/configuracoes/subscricao"
        className="mt-3 inline-block rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
      >
        Ver planos →
      </a>
    </div>
  );
}

export function SubscricaoSuspensaBanner() {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <p className="text-sm font-medium text-red-800">
        A tua conta está suspensa. Apenas leitura disponível.
      </p>
      <a
        href="/configuracoes/subscricao"
        className="mt-3 inline-block rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
      >
        Reactivar conta →
      </a>
    </div>
  );
}

// Banner global no topo do layout
export function SubscricaoStatusBanner() {
  const { clinica } = useAuthStore();
  const { subscricaoEstado, subscricaoValidaAte, plano } = clinica;

  if (subscricaoEstado === 'ACTIVA') return null;

  const diasRestantes = subscricaoValidaAte
    ? differenceInDays(new Date(subscricaoValidaAte), new Date())
    : null;

  if (subscricaoEstado === 'TRIAL' && diasRestantes !== null && diasRestantes <= 7) {
    return (
      <div className="bg-blue-600 px-4 py-2 text-center text-sm text-white">
        Trial termina em <strong>{diasRestantes} dias</strong>.{' '}
        <a href="/configuracoes/subscricao" className="underline">Escolhe um plano</a>
      </div>
    );
  }

  if (subscricaoEstado === 'GRACE_PERIOD') {
    return (
      <div className="bg-amber-500 px-4 py-2 text-center text-sm text-white">
        Subscrição expirada. Tens <strong>{diasRestantes ?? 0} dias</strong> para renovar.{' '}
        <a href="/configuracoes/subscricao" className="underline font-semibold">Renovar agora</a>
      </div>
    );
  }

  if (subscricaoEstado === 'SUSPENSA') {
    return (
      <div className="bg-red-600 px-4 py-2 text-center text-sm text-white">
        Conta suspensa — apenas leitura disponível.{' '}
        <a href="/configuracoes/subscricao" className="underline font-semibold">Reactivar</a>
      </div>
    );
  }

  return null;
}
