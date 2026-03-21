---
name: tdd
description: >
  Skill transversal obrigatória. Usa SEMPRE que implementares qualquer service,
  route handler, job, ou componente React. Define o ciclo RED→GREEN→REFACTOR,
  padrões de mock por tipo de dependência (Evolution API, n8n, Prisma, BullMQ),
  thresholds de coverage, e a ordem correcta de criação de ficheiros.
  Esta skill aplica-se a TODOS os módulos — não é opcional.
references:
  - reference/ciclo-rg-refactor.md
  - reference/mocks-externos.md
  - reference/cobertura-thresholds.md
related_skills:
  - whatsapp/SKILL.md: mocks evolutionApi e n8nApi descritos em detalhe
  - SKILL-redis-bullmq.md: mock para BullMQ workers
---

## Quando usar esta skill

- SEMPRE que implementares um novo service, route, job, ou componente
- SEMPRE que alterares código existente com risco de regressão
- Quando o prompt diz "implementa X" — TDD é o método de implementação

## O ciclo obrigatório

```
1. RED    → escreve o teste que descreve o comportamento
             confirma que FALHA (por razão certa — não erro de sintaxe)
2. GREEN  → escreve o MÍNIMO de código para o teste passar
             não optimizar ainda
3. REFACTOR → limpa sem mudar comportamento
              testes continuam verdes
```

**Regra de ouro:** nunca escreves código de produção sem um teste a falhar primeiro.

## Regras absolutas

**CORRECTO ✅ — teste antes do código**
```typescript
// 1. Escrever PRIMEIRO:
it('deve criar agendamento via WhatsApp quando input válido', async () => {
  mockEvolutionApi.enviarTexto.mockResolvedValue({ key: { id: 'msg-1' } });
  await waConversaService.etapaConfirmar(numero, clinicaId, instanceName, '1');
  expect(prisma.agendamento.create).toHaveBeenCalledWith(
    expect.objectContaining({ canal: 'WHATSAPP' })
  );
});
// 2. SÓ DEPOIS implementar etapaConfirmar()
```

**ERRADO ❌ — código primeiro, testes depois**
```typescript
// "Implementa o service e depois escreve os testes para verificar"
// Isto não é TDD. É verificação retroactiva.
```

## Checklist TDD antes de submeter

- [ ] Todos os testes novos têm nome no formato `deve [comportamento] quando [condição]`
- [ ] Cada teste tem `// Arrange`, `// Act`, `// Assert` (ou comentários equivalentes)
- [ ] Mocks resetados em `beforeEach(() => { vi.clearAllMocks(); })`
- [ ] `pnpm test --run` passa a verde
- [ ] Coverage não regrediu face ao commit anterior
- [ ] Zero `it.only`, `test.only`, ou `describe.only` no commit

## Ver também

- `reference/ciclo-rg-refactor.md` — exemplo completo do ciclo
- `reference/mocks-externos.md` — mocks para Evolution API, n8n, Prisma, BullMQ
- `reference/cobertura-thresholds.md` — thresholds por módulo
