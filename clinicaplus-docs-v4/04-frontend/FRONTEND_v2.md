# ClinicaPlus v2 — Frontend (Delta)

Delta em relação a `04-frontend/FRONTEND.md` (v1).

---

## 1. Novos Packages

```bash
pnpm add socket.io-client vite-plugin-pwa --filter=web
```

---

## 2. Hook useSocket

```typescript
// src/hooks/useSocket.ts
import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

// Singleton fora do componente — sobrevive a re-renders
let instance: Socket | null = null;

export function useSocket(): Socket | null {
  const accessToken = useAuthStore(s => s.accessToken);
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || instance) { ref.current = instance; return; }

    instance = io(import.meta.env.VITE_API_URL, {
      path: '/ws',
      auth: { token: accessToken },
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });

    instance.on('auth:expired', () => {
      instance?.disconnect();
      instance = null;
      // O refreshToken interceptor do Axios já trata o refresh — WS reconecta no próximo render
    });

    ref.current = instance;

    return () => {
      instance?.disconnect();
      instance = null;
    };
  }, [accessToken]);

  return ref.current;
}
```

---

## 3. Hook useSocketEvent + useAgendamentosRealtime

```typescript
// src/hooks/useSocketEvent.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';

export function useSocketEvent<T>(event: string, handler: (data: T) => void) {
  const socket = useSocket();
  useEffect(() => {
    if (!socket) return;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [socket, event, handler]);
}

// src/hooks/useAgendamentosRealtime.ts
import { useQueryClient } from '@tanstack/react-query';
import { useSocketEvent } from './useSocketEvent';
import { agendamentosKeys } from './useAgendamentos';

export function useAgendamentosRealtime() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: agendamentosKeys.hoje() });
    qc.invalidateQueries({ queryKey: agendamentosKeys.lists() });
  };
  useSocketEvent('agendamento:criado',  invalidate);
  useSocketEvent('agendamento:estado',  invalidate);
  useSocketEvent('agendamento:triagem', invalidate);
}
```

---

## 4. Badge "Tempo Real" — Componente

```typescript
// src/components/RealtimeBadge.tsx
import { useSocket } from '../hooks/useSocket';
import { useSyncExternalStore } from 'react';

function getSnapshot(socket: ReturnType<typeof useSocket>) {
  return socket?.connected ?? false;
}

export function RealtimeBadge() {
  const socket = useSocket();
  const connected = useSyncExternalStore(
    (cb) => { socket?.on('connect', cb).on('disconnect', cb); return () => { socket?.off('connect', cb).off('disconnect', cb); }; },
    () => socket?.connected ?? false,
    () => false
  );

  return (
    <div className="flex items-center gap-1.5 text-xs text-neutral-400">
      <span className={`h-1.5 w-1.5 rounded-full transition-colors ${connected ? 'bg-success-500' : 'bg-neutral-300'}`} />
      {connected ? 'Tempo real' : 'A reconectar...'}
    </div>
  );
}
```

---

## 5. Actualizar HojePage

```typescript
// pages/recepcao/HojePage.tsx — alterações mínimas
import { useAgendamentosRealtime } from '../../hooks/useAgendamentosRealtime';
import { RealtimeBadge } from '../../components/RealtimeBadge';

export default function HojePage() {
  const { data, isLoading } = useAgendamentosHoje();
  useAgendamentosRealtime();  // ← adicionar esta linha

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Hoje</h1>
        <RealtimeBadge />   {/* ← adicionar este badge */}
      </div>
      {/* resto do JSX inalterado */}
    </div>
  );
}
// Remover refetchInterval se existia
```

---

## 6. Módulo Financeiro — Estrutura de Páginas

```
pages/financeiro/
├── FaturasPage.tsx        lista com tabs por estado
├── NovaFaturaPage.tsx     wizard 3 passos
└── FaturaDetalhe.tsx      detalhe + pagamentos + imprimir
```

### FaturasPage.tsx

```typescript
// Tabs: Rascunhos | Emitidas | Pagas | Anuladas
// Cada linha: número | paciente | médico | total | data | estado | acções
// Acções: ver detalhe, emitir (se rascunho), registar pagamento (se emitida)
// Botão "Nova Fatura" → /admin/financeiro/nova

export default function FaturasPage() {
  const [tab, setTab] = useState<EstadoFatura>('EMITIDA');
  const { data, isLoading } = useFaturas({ estado: tab });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Faturas</h1>
        <Link to="/admin/financeiro/nova">
          <Button>Nova Fatura</Button>
        </Link>
      </div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200">
        {(['RASCUNHO','EMITIDA','PAGA','ANULADA'] as const).map(s => (
          <button key={s} onClick={() => setTab(s)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === s ? 'border-primary-500 text-primary-700' : 'border-transparent text-neutral-500 hover:text-neutral-700'}`}>
            {ESTADO_LABEL[s]}
          </button>
        ))}
      </div>
      {/* Tabela */}
      <FaturasTable data={data?.items} isLoading={isLoading} />
    </div>
  );
}
```

### NovaFaturaPage.tsx — Wizard 3 Passos

```typescript
// Passo 1: Paciente + Agendamento
//   - ComboBox pesquisa de paciente (debounce 350ms)
//   - Se paciente tem agendamentos recentes concluídos → sugerir associar
//   - Tipo: PARTICULAR | SEGURO (select)

// Passo 2: Itens
//   - Item pré-preenchido: "Consulta de [Especialidade]" preço = medico.preco
//   - useFieldArray para adicionar/remover itens
//   - Desconto global (número inteiro Kz)
//   - Total em tempo real (formatKwanza)
//   - Componente ItemRow com colunas: Descrição | Qtd | Preço Unit | Total | Remover

// Passo 3: Revisão
//   - Resumo completo
//   - Opções: "Guardar como Rascunho" | "Emitir já"
//   - Submit → POST /faturas + (se emitir) PATCH /faturas/:id/emitir

function ItemRow({ index, onRemove }) {
  const { register, watch } = useFormContext();
  const precoUnit = watch(`itens.${index}.precoUnit`) ?? 0;
  const quantidade = watch(`itens.${index}.quantidade`) ?? 1;
  const desconto   = watch(`itens.${index}.desconto`) ?? 0;
  const total = (precoUnit * quantidade) - desconto;

  return (
    <tr className="border-b border-neutral-100 hover:bg-neutral-50">
      <td className="px-3 py-2">
        <input {...register(`itens.${index}.descricao`)} className="w-full text-sm outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2 w-20">
        <input {...register(`itens.${index}.quantidade`, { valueAsNumber: true })} type="number" min="1" className="w-16 text-center text-sm outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2 w-36">
        <input {...register(`itens.${index}.precoUnit`, { valueAsNumber: true })} type="number" className="w-full text-right font-mono text-sm outline-none bg-transparent" />
      </td>
      <td className="px-3 py-2 w-32 text-right font-mono text-sm font-semibold">
        {formatKwanza(total)}
      </td>
      <td className="px-3 py-2 w-10 text-center">
        <button type="button" onClick={onRemove} className="text-neutral-300 hover:text-danger-500">
          <X className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}
```

### FaturaDetalhe.tsx

```typescript
// Layout: painel esquerdo (dados + itens) | painel direito (acções + pagamentos)
// Estado RASCUNHO:  [Editar] [Emitir Fatura]
// Estado EMITIDA:   [Registar Pagamento] [Anular] [Imprimir]
// Estado PAGA:      [Imprimir] [Ver Pagamentos]
// Estado ANULADO:   apenas visualização

// Progress bar de pagamento:
// totalPago / fatura.total → width da barra (bg-success-500 quando PAGA)

// Modal de pagamento:
function PagamentoModal({ faturaId, onSuccess }) {
  const form = useForm<PagamentoInput>({ resolver: zodResolver(PagamentoSchema) });
  const metodo = form.watch('metodo');

  return (
    <Modal title="Registar Pagamento">
      <div className="space-y-4">
        <FormField label="Método">
          <select {...form.register('metodo')} className={inputClass()}>
            <option value="DINHEIRO">Dinheiro</option>
            <option value="TRANSFERENCIA_BANCARIA">Transferência Bancária</option>
            <option value="TPA">TPA</option>
            <option value="SEGURO">Seguro de Saúde</option>
          </select>
        </FormField>
        <FormField label="Valor (Kz)">
          <input {...form.register('valor', { valueAsNumber: true })} type="number" className={inputClass()} />
        </FormField>
        {metodo === 'SEGURO' && (
          <>
            <FormField label="Seguradora">
              <select {...form.register('seguro.seguradora')} className={inputClass()}>
                {SEGURADORAS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </FormField>
            <FormField label="Nº Beneficiário">
              <input {...form.register('seguro.numeroBeneficiario')} className={inputClass()} />
            </FormField>
          </>
        )}
        <FormField label="Referência (opcional)">
          <input {...form.register('referencia')} className={inputClass()} />
        </FormField>
      </div>
    </Modal>
  );
}
```

---

## 7. Relatórios — RelatoriosPage

```typescript
// pages/financeiro/RelatoriosPage.tsx
// Acesso: ADMIN (plano Pro verifica no backend)

// Filtros: período (mês corrente | mês anterior | trimestre | custom), médico, tipo
// Aviso BASICO: se plano BASICO e período histórico selecionado → mostrar upgrade banner

// 4 KPI cards:
// Receita Total | Consultas | Média/Consulta | Seguros Pendentes

// Gráfico de barras (sem biblioteca — divs com height calculada):
function BarChart({ data }: { data: { data: string; receita: number }[] }) {
  const max = Math.max(...data.map(d => d.receita), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map(d => (
        <div key={d.data} className="flex-1 flex flex-col items-center gap-1">
          <div className="w-full bg-primary-200 rounded-t" style={{ height: `${(d.receita / max) * 100}%` }} title={formatKwanza(d.receita)} />
          <span className="text-[10px] text-neutral-400 truncate w-full text-center">{formatShortDate(d.data)}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## 8. Gestão de API Keys — IntegracoesPage

```typescript
// pages/admin/IntegracoesPage.tsx
// Disponível apenas em plano Pro e Enterprise

// Tab API Keys: lista + botão "Nova API Key"
// Ao criar: mostrar token COMPLETO UMA VEZ com aviso e botão de copiar
function GeneratedTokenAlert({ token, onClose }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-warning-50 border border-warning-200 p-3">
        <p className="text-sm font-semibold text-warning-800">⚠ Guarda este token agora</p>
        <p className="text-xs text-warning-600 mt-1">Por segurança, não voltará a ser exibido.</p>
      </div>
      <div className="flex gap-2 items-center">
        <code className="flex-1 font-mono text-xs bg-neutral-50 border border-neutral-200 rounded-md px-3 py-2 break-all select-all">
          {token}
        </code>
        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(token)}>
          <Copy className="h-4 w-4" />
        </Button>
      </div>
      <Button onClick={onClose} className="w-full">Feito — já guardei o token</Button>
    </div>
  );
}

// Tab Webhooks: lista + botão "Novo Webhook" + histórico de entregas por webhook
```

---

## 9. PWA (Opcional — Sprint 6)

```typescript
// vite.config.ts — adicionar apenas no final dos sprints
import { VitePWA } from 'vite-plugin-pwa';

VitePWA({
  registerType: 'autoUpdate',
  manifest: {
    name: 'ClinicaPlus', short_name: 'ClinicaPlus',
    theme_color: '#2563eb', display: 'standalone',
    icons: [{ src: '/icon-192.png', sizes: '192x192' }, { src: '/icon-512.png', sizes: '512x512' }],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    runtimeCaching: [{ urlPattern: /\/api\/dashboard/, handler: 'StaleWhileRevalidate' }],
  },
})
```

---

## 10. Checklist Frontend v2

- [ ] `useAgendamentosRealtime()` activo na HojePage — `refetchInterval` removido
- [ ] `RealtimeBadge` visível: verde quando connected, cinzento quando não
- [ ] Reconexão após `auth:expired`: WS reconecta sem acção do utilizador
- [ ] Módulo financeiro: todos os valores exibidos com `formatKwanza()` (sem decimais)
- [ ] `NovaFaturaPage`: totais recalculados em tempo real (sem chamada à API)
- [ ] Token de API key mostrado UMA VEZ com botão de copiar e aviso claro
- [ ] `pnpm typecheck --filter=web` zero erros
