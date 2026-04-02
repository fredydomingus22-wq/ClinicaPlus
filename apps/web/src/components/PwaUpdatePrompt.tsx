import { useRegisterSW } from 'virtual:pwa-register/react'

/**
 * PwaUpdatePrompt - Exibe um alerta discreto quando uma nova versão
 * do sistema DocAgen está disponível.
 */
export function PwaUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r: ServiceWorkerRegistration | undefined) {
      // Verificar se há actualizações a cada hora
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000)
      }
    },
    onRegisterError() {
      // SW não pôde ser registado — silencioso em produção
    },
  })

  if (!needRefresh) return null

  return (
    <div
      data-testid="pwa-update-prompt"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80
                bg-primary-600 text-white rounded-xl shadow-lg p-4 z-50
                flex items-center justify-between gap-3 animate-in slide-in-from-bottom"
    >
      <div>
        <p className="text-sm font-semibold text-white">Nova versão disponível</p>
        <p className="text-xs text-primary-100 mt-0.5">
          Actualiza o DocAgen para as últimas melhorias.
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          onClick={() => setNeedRefresh(false)}
          className="text-xs text-primary-100 hover:text-white px-2 py-1"
        >
          Ignorar
        </button>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs bg-white text-primary-700 font-semibold
                    px-3 py-1 rounded-lg hover:bg-primary-50 active:scale-95"
        >
          Actualizar
        </button>
      </div>
    </div>
  )
}
