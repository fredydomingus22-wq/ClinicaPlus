# Reference — Mocks para Dependências Externas

## Padrão de mock para Evolution API

```typescript
// apps/api/src/test/mocks/evolutionApi.mock.ts
import { vi } from 'vitest';

export const mockEvolutionApi = {
  criarInstancia:  vi.fn().mockResolvedValue({ instanceName: 'cp-test', status: 'created' }),
  obterQrCode:     vi.fn().mockResolvedValue({ base64: 'data:image/png;base64,iVBOR...' }),
  estadoConexao:   vi.fn().mockResolvedValue({ state: 'open' }),
  enviarTexto:     vi.fn().mockResolvedValue({ key: { id: 'msg-test-1' }, status: 'PENDING' }),
  desligar:        vi.fn().mockResolvedValue(undefined),
  eliminar:        vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));
```

**Uso nos testes:**
```typescript
import { mockEvolutionApi } from '../test/mocks/evolutionApi.mock';

// Testar o que foi enviado
expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledTimes(1);
expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
  'cp-test-instance',
  '244923456789',
  expect.stringContaining('Cardiologia')
);

// Simular falha de rede
mockEvolutionApi.enviarTexto.mockRejectedValueOnce(new Error('Network timeout'));

// Simular instância desconectada
mockEvolutionApi.estadoConexao.mockResolvedValueOnce({ state: 'close' });
```

---

## Padrão de mock para n8n API

```typescript
// apps/api/src/test/mocks/n8nApi.mock.ts
import { vi } from 'vitest';

export const mockN8nApi = {
  criarWorkflow:  vi.fn().mockResolvedValue({
    workflowId: 'wf-test-1',
    webhookPath: 'wa-marcacao-cp-test',
  }),
  activar:        vi.fn().mockResolvedValue(undefined),
  desactivar:     vi.fn().mockResolvedValue(undefined),
  eliminar:       vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/n8nApi', () => ({ n8nApi: mockN8nApi }));
```

**Uso nos testes:**
```typescript
import { mockN8nApi } from '../test/mocks/n8nApi.mock';

// Verificar que o workflow foi criado com o tipo correcto
expect(mockN8nApi.criarWorkflow).toHaveBeenCalledWith(
  'MARCACAO_CONSULTA',
  expect.objectContaining({ clinicaId: 'clinica-test-1' })
);

// Simular n8n em baixo — deve não bloquear a desactivação
mockN8nApi.desactivar.mockRejectedValueOnce(new Error('n8n unavailable'));
// O service deve fazer catch e continuar
```

---

## Padrão de mock para Prisma (unit tests)

```typescript
// apps/api/src/test/mocks/prisma.mock.ts
import { vi } from 'vitest';

// Mock declarativo — especificar apenas o que cada teste precisa
export const mockPrisma = {
  waInstancia:  { findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
  waAutomacao:  { findFirstOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  waConversa:   { upsert: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  waMensagem:   { create: vi.fn() },
  medico:       { findMany: vi.fn(), count: vi.fn() },
  agendamento:  { create: vi.fn(), findMany: vi.fn() },
  clinica:      { findUniqueOrThrow: vi.fn() },
  apiKey:       { findFirst: vi.fn(), create: vi.fn() },
  auditLog:     { create: vi.fn() },
  $transaction: vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
```

**Para integration tests, usar banco real:**
```typescript
// apps/api/src/test/integration/setup.ts
// Usar DATABASE_URL_TEST apontado para Supabase de teste
// beforeEach: limpar tabelas wa_* via prisma.deleteMany
// afterAll: fechar conexão prisma.$disconnect()
```

---

## Padrão de mock para BullMQ (jobs)

```typescript
// Mock da fila — não correr o job real nos testes unitários
import { vi } from 'vitest';

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'job-test-1' }),
  })),
  Worker: vi.fn(),
}));

// Testar o conteúdo que seria enfileirado
expect(mockQueue.add).toHaveBeenCalledWith(
  'wa-lembrete-24h',
  expect.objectContaining({ agendamentoId: 'ag-1', clinicaId: 'clinica-1' }),
  expect.objectContaining({ delay: expect.any(Number) })
);
```

---

## Padrão de mock para WebSocket (publishEvent)

```typescript
vi.mock('../../lib/eventBus', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

import { publishEvent } from '../../lib/eventBus';

// Verificar notificação em tempo real
expect(publishEvent).toHaveBeenCalledWith(
  'clinica:clinica-test-1',
  'whatsapp:estado',
  { estado: 'CONECTADO' }
);
```
