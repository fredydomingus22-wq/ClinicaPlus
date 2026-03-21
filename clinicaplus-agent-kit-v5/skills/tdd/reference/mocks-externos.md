# Reference — Mocks para Dependências Externas

## vitest.config.ts (apps/api)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals:     true,
    environment: 'node',
    setupFiles:  ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/services/**', 'src/routes/**', 'src/lib/**'],
      exclude:  ['src/test/**', 'src/seeds/**'],
      thresholds: {
        'src/services/wa-*':        { lines: 85, functions: 85 },
        'src/services/logo*':       { lines: 85, functions: 85 },
        'src/services/subscricao*': { lines: 90, functions: 90 },
        'src/lib/evolutionApi*':    { lines: 75, functions: 75 },
        'src/lib/n8nApi*':          { lines: 75, functions: 75 },
      },
    },
  },
});
```

## Setup global

```typescript
// apps/api/src/test/setup.ts
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});
```

## Mock Evolution API

```typescript
// apps/api/src/test/mocks/evolutionApi.mock.ts
import { vi } from 'vitest';

export const mockEvolutionApi = {
  criarInstancia:    vi.fn().mockResolvedValue({ instance: { instanceName: 'cp-test', status: 'created' } }),
  obterQrCode:       vi.fn().mockResolvedValue({ base64: 'data:image/png;base64,TEST', code: 'QR' }),
  estadoConexao:     vi.fn().mockResolvedValue({ instance: { state: 'open' } }),
  enviarTexto:       vi.fn().mockResolvedValue({ key: { id: 'msg-1' }, status: 'PENDING' }),
  desligar:          vi.fn().mockResolvedValue(undefined),
  eliminar:          vi.fn().mockResolvedValue(undefined),
  actualizarWebhook: vi.fn().mockResolvedValue(undefined),
};

vi.mock('../../lib/evolutionApi', () => ({ evolutionApi: mockEvolutionApi }));
```

**Uso nos testes:**
```typescript
import { mockEvolutionApi } from '../test/mocks/evolutionApi.mock';

// Verificar o que foi enviado
expect(mockEvolutionApi.enviarTexto).toHaveBeenCalledWith(
  'cp-test',
  '244923456789',
  expect.stringContaining('Cardiologia')
);

// Simular falha de rede
mockEvolutionApi.enviarTexto.mockRejectedValueOnce(new Error('Network timeout'));

// Simular instância desconectada
mockEvolutionApi.estadoConexao.mockResolvedValueOnce({ instance: { state: 'close' } });
```

## Mock n8n API

```typescript
// apps/api/src/test/mocks/n8nApi.mock.ts
import { vi } from 'vitest';

export const mockN8nApi = {
  criarWorkflow: vi.fn().mockResolvedValue({ workflowId: 'wf-1', webhookPath: 'wa-marcacao-test' }),
  activar:       vi.fn().mockResolvedValue(undefined),
  desactivar:    vi.fn().mockResolvedValue(undefined),
  eliminar:      vi.fn().mockResolvedValue(undefined),
  detalhes:      vi.fn().mockResolvedValue({ id: 'wf-1', active: true, nodes: [] }),
};

vi.mock('../../lib/n8nApi', () => ({ n8nApi: mockN8nApi }));
```

**Simular n8n em baixo (para testar desactivação resiliente):**
```typescript
mockN8nApi.desactivar.mockRejectedValueOnce(new Error('n8n unavailable'));
// O service deve ter .catch() e continuar — o DB deve ser actualizado
```

## Mock Prisma (unit tests)

```typescript
// apps/api/src/test/mocks/prisma.mock.ts
import { vi } from 'vitest';

export const mockPrisma = {
  waInstancia:   { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
  waAutomacao:   { findFirstOrThrow: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  waConversa:    { upsert: vi.fn(), update: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
  waMensagem:    { create: vi.fn() },
  medico:        { findMany: vi.fn(), count: vi.fn() },
  agendamento:   { create: vi.fn(), findMany: vi.fn() },
  clinica:       { findUniqueOrThrow: vi.fn(), findFirst: vi.fn() },
  paciente:      { findFirst: vi.fn(), create: vi.fn() },
  apiKey:        { findFirst: vi.fn(), create: vi.fn() },
  auditLog:      { create: vi.fn() },
  configuracaoClinica: { findFirst: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  $transaction:  vi.fn((fn: (tx: unknown) => Promise<unknown>) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma', () => ({ prisma: mockPrisma }));
```

## Mock Supabase Storage (para logo.service.ts)

```typescript
import { vi } from 'vitest';

const mockUpload  = vi.fn().mockResolvedValue({ error: null });
const mockRemove  = vi.fn().mockResolvedValue({ error: null });
const mockList    = vi.fn().mockResolvedValue({ data: [{ name: 'logo.png' }], error: null });
const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://storage.supabase.co/logos/test/logo.png' } });

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: {
      from: vi.fn(() => ({
        upload:       mockUpload,
        remove:       mockRemove,
        list:         mockList,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  })),
}));
```

## Mock publishEvent (WebSocket)

```typescript
vi.mock('../../lib/eventBus', () => ({
  publishEvent: vi.fn().mockResolvedValue(undefined),
}));

import { publishEvent } from '../../lib/eventBus';

// Verificar notificação em tempo real
expect(publishEvent).toHaveBeenCalledWith(
  'clinica:test-id',
  'whatsapp:estado',
  expect.objectContaining({ estado: 'CONECTADO' })
);
```
