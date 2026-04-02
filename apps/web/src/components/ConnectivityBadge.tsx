import { useOnlineStatus } from '../hooks/useOnlineStatus';

/**
 * ConnectivityBadge - Exibe um alerta discreto no topo da tela quando a aplicação perde o sinal.
 * Não exibe nada quando online para não distrair o utilizador.
 */
export function ConnectivityBadge() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      data-testid="connectivity-badge"
      className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950
                text-xs font-semibold text-center py-1.5 px-4
                flex items-center justify-center gap-1.5"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-amber-800 animate-pulse" />
      Sem ligação · Os dados apresentados podem não estar actualizados
    </div>
  );
}
