# Reference — Ciclo Red-Green-Refactor no ClinicaPlus

## Setup do ambiente de testes

```bash
# Framework: Vitest (inferido do stack Vite + Node 20)
pnpm add -D vitest @vitest/coverage-v8 vitest-mock-extended --filter=api
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event --filter=web

# Correr testes em watch mode (durante desenvolvimento TDD)
pnpm test --filter=api              # watch mode
pnpm test --run --filter=api        # single run (CI)
pnpm test --run --coverage --filter=api
```

## vitest.config.ts para apps/api

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        // Thresholds por módulo — ver reference/cobertura-e-thresholds.md
        lines: 80, functions: 80, branches: 75,
      },
      include: ['src/services/**', 'src/routes/**', 'src/lib/**'],
      exclude: ['src/test/**', 'src/seeds/**', 'src/**/*.d.ts'],
    },
  },
});
```

## Setup global de testes

```typescript
// apps/api/src/test/setup.ts
import { vi, beforeEach } from 'vitest';

// Reset todos os mocks entre testes
beforeEach(() => {
  vi.clearAllMocks();
});

// Mock do Prisma — usar prisma-mock ou instância de teste real
// Para unit tests: mock completo
// Para integration tests: usar banco PostgreSQL de teste (DATABASE_URL_TEST)
```

## Estrutura de ficheiros de teste

```
apps/api/src/
  services/
    wa-conversa.service.ts
    wa-conversa.service.test.ts    ← unit tests do service
  routes/
    whatsapp.ts
    whatsapp.test.ts               ← integration tests das rotas (supertest)
  lib/
    evolutionApi.ts
    evolutionApi.test.ts           ← unit tests do cliente HTTP

apps/web/src/
  pages/configuracoes/
    WhatsappPage.tsx
    WhatsappPage.test.tsx          ← component tests (@testing-library)
  components/wa/
    WaConexaoCard.tsx
    WaConexaoCard.test.tsx
```

## Exemplo completo do ciclo Red-Green-Refactor

### Feature: "etapa de início deve listar especialidades disponíveis"

**RED — escreve o teste que falha:**
```typescript
// wa-conversa.service.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { waConversaService } from './wa-conversa.service';
import { evolutionApi } from '../lib/evolutionApi';
import { prisma } from '../lib/prisma';

vi.mock('../lib/evolutionApi');
vi.mock('../lib/prisma', () => ({
  prisma: {
    waConversa: { upsert: vi.fn() },
    medico:     { findMany: vi.fn() },
    clinica:    { findUniqueOrThrow: vi.fn() },
  },
}));

describe('waConversaService.etapaInicio', () => {
  const numero      = '244923456789';
  const clinicaId   = 'clinica-test-1';
  const instanceName = 'cp-test-1';

  beforeEach(() => {
    vi.mocked(prisma.clinica.findUniqueOrThrow).mockResolvedValue(
      { id: clinicaId, nome: 'Clínica Teste' } as never
    );
    vi.mocked(prisma.medico.findMany).mockResolvedValue([
      { especialidade: 'Cardiologia' },
      { especialidade: 'Pediatria' },
    ] as never);
    vi.mocked(prisma.waConversa.upsert).mockResolvedValue(
      { id: 'conv-1' } as never
    );
    vi.mocked(evolutionApi.enviarTexto).mockResolvedValue({ messageId: 'msg-1' });
  });

  it('deve enviar lista de especialidades ao iniciar fluxo', async () => {
    await waConversaService.etapaInicio(numero, clinicaId, instanceName);

    expect(evolutionApi.enviarTexto).toHaveBeenCalledWith(
      instanceName,
      numero,
      expect.stringContaining('Cardiologia')
    );
    expect(evolutionApi.enviarTexto).toHaveBeenCalledWith(
      instanceName,
      numero,
      expect.stringContaining('Pediatria')
    );
  });

  it('deve criar/actualizar conversa com etapa ESCOLHA_ESPECIALIDADE', async () => {
    await waConversaService.etapaInicio(numero, clinicaId, instanceName);

    expect(prisma.waConversa.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ etapaFluxo: 'ESCOLHA_ESPECIALIDADE' }),
      })
    );
  });

  it('deve incluir nome da clínica na mensagem de boas-vindas', async () => {
    await waConversaService.etapaInicio(numero, clinicaId, instanceName);

    expect(evolutionApi.enviarTexto).toHaveBeenCalledWith(
      instanceName, numero, expect.stringContaining('Clínica Teste')
    );
  });
});
```

Correr: `pnpm test --filter=api` → 3 testes a VERMELHO ✗

**GREEN — escreve o mínimo de código:**
```typescript
// wa-conversa.service.ts — apenas o método etapaInicio
async etapaInicio(numero: string, clinicaId: string, instanceName: string) {
  const clinica = await prisma.clinica.findUniqueOrThrow({ where: { id: clinicaId } });
  const medicos = await prisma.medico.findMany({
    where: { clinicaId, ativo: true },
    select: { especialidade: true },
    distinct: ['especialidade'],
  });
  const especialidades = medicos.map(m => m.especialidade);

  await prisma.waConversa.upsert({
    where: { instanciaId_numeroWhatsapp: { instanciaId: 'placeholder', numeroWhatsapp: numero } },
    create: { instanciaId: 'placeholder', numeroWhatsapp: numero, etapaFluxo: 'ESCOLHA_ESPECIALIDADE' },
    update: { etapaFluxo: 'ESCOLHA_ESPECIALIDADE', contexto: {} },
  });

  const msg = `Olá! Bem-vindo à *${clinica.nome}*.\n\n` +
    especialidades.map((e, i) => `${i + 1}. ${e}`).join('\n');
  await evolutionApi.enviarTexto(instanceName, numero, msg);
},
```

Correr: `pnpm test --filter=api` → 3 testes a VERDE ✓

**REFACTOR — sem mudar comportamento:**
- Extrair `getNomeClinica(clinicaId)` helper
- Extrair `getEspecialidadesClinica(clinicaId)` helper
- Melhorar mensagem com numeração e instrução "Responde com o número"
- Correr testes: ainda VERDE ✓
