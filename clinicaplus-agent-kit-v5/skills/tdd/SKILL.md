---
name: tdd
description: >
  Usa esta skill em QUALQUER tarefa de implementação no ClinicaPlus.
  Define o ciclo Red-Green-Refactor obrigatório, os padrões de teste por camada
  (unit, integration, e2e), como usar mocks para Evolution API e n8n,
  e a ordem correcta de ficheiros a criar (test primeiro, código depois).
  Esta skill aplica-se a todos os outros módulos — é transversal.
references:
  - reference/ciclo-red-green-refactor.md
  - reference/padroes-por-camada.md
  - reference/mocks-externos.md
  - reference/cobertura-e-thresholds.md
related_skills:
  - SKILL-whatsapp: mocks para evolutionApi e n8nApi descritos em detalhe
  - SKILL-redis-bullmq: padrão de mock para BullMQ workers
  - SKILL-financeiro: exemplos de testes para services financeiros
---

## Quando usar esta skill

- SEMPRE que implementares um novo service, route handler, ou componente React
- SEMPRE antes de alterar código existente com risco de regressão
- Quando o prompt disser "implementa X" — o ciclo TDD é o método de implementação

## Quando NÃO usar

- Ficheiros de configuração (tsconfig, prisma.schema, vite.config)
- Seeds e migrations
- Ficheiros de tipo (.d.ts)
- Protótipos rápidos marcados explicitamente como "não produção"

## O ciclo obrigatório

```
1. RED   → escreve o teste que descreve o comportamento esperado
           confirma que falha (por razão certa, não erro de sintaxe)
2. GREEN → escreve o mínimo de código para o teste passar
           não optimizar ainda
3. REFACTOR → limpa o código sem mudar comportamento
              testes continuam a passar
```

**Regra de ouro:** nunca escreves código de produção sem um teste a falhar primeiro.

## Sub-skills disponíveis

| Ficheiro | Quando ler |
|----------|-----------|
| `reference/ciclo-red-green-refactor.md` | Primeiro contacto com TDD ou dúvidas sobre o ciclo |
| `reference/padroes-por-camada.md` | Saber o que testar em cada camada (unit/integration/e2e) |
| `reference/mocks-externos.md` | Testar código que depende de Evolution API, n8n, Redis |
| `reference/cobertura-e-thresholds.md` | Configurar coverage e thresholds por módulo |

## Regras absolutas

**CORRECTO ✅**
```typescript
// 1. Escreve o teste primeiro
it('deve criar agendamento via WhatsApp quando input válido', async () => {
  // arrange
  mockEvolutionApi.enviarTexto.mockResolvedValue({ messageId: 'msg-1' });
  // act
  await waConversaService.etapaConfirmar(numero, clinicaId, instanceName, '1');
  // assert
  expect(prisma.agendamento.create).toHaveBeenCalledWith(
    expect.objectContaining({ canal: 'WHATSAPP', clinicaId })
  );
});

// 2. Só depois implementa etapaConfirmar()
```

**ERRADO ❌**
```typescript
// NUNCA implementar primeiro e adicionar testes depois
// "escreve os testes para o código que já fizeste"
// — não é TDD, é verificação retroactiva
```

---

**CORRECTO ✅**
```typescript
// Um teste por comportamento — nome descreve o quê, não o como
it('deve rejeitar marcação fora do horário configurado', ...)
it('deve repetir etapa após resposta inválida (máx 3 tentativas)', ...)
it('deve criar paciente se número desconhecido', ...)
```

**ERRADO ❌**
```typescript
// Nomes genéricos ou que descrevem implementação
it('testa o service', ...)
it('chama prisma.create', ...)
```

---

**CORRECTO ✅**
```typescript
// Mock apenas dependências externas — testar a lógica real
vi.mock('../lib/evolutionApi');      // externo — simular
vi.mock('../lib/n8nApi');            // externo — simular
// prisma usa prisma-mock ou banco de teste real (integration)
```

**ERRADO ❌**
```typescript
// Não mockar o próprio service que estás a testar
vi.mock('../services/wa-conversa.service');  // estás a testar isto!
```

## Checklist antes de submeter

- [ ] Todos os testes novos descritos no formato `deve [comportamento] quando [condição]`
- [ ] Cada teste tem arrange / act / assert claramente separados
- [ ] Mocks resetados em `beforeEach` ou `afterEach`
- [ ] `pnpm test --run` passa a verde
- [ ] Coverage não regrediu (ver thresholds em `reference/cobertura-e-thresholds.md`)
- [ ] Nenhum `it.only`, `test.only`, ou `describe.only` no commit

## Ver também

- `docs/08-testing/TESTING_v2.md` — configuração Playwright + k6
- `kit/skills/whatsapp/SKILL.md` → `reference/tdd-whatsapp.md` — casos de teste específicos do módulo WA
