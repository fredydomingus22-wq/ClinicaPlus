# Referência: Máquinas de Estado — Tratamentos e Exames

## Tabela de transições completa

*(Para Exames Legados sem Estado Enum, assumir mapeamento de "PENDENTE" na infra)*

### Exame (Extensão)

| Estado Actual | Transições Válidas | Evento de Negócio |
|--------------|-------------------|-------------------|
| `PENDENTE` | `AGENDADO`, `CANCELADO` | Clínica agenda o exame / médico cancela pedido |
| `AGENDADO` | `REALIZADO`, `CANCELADO` | Exame realizado / cancelado no dia |
| `REALIZADO` | `LAUDADO` | Laudo recebido e registado |
| `LAUDADO` | *(nenhuma)* | Estado final — exame com laudo |
| `CANCELADO` | *(nenhuma)* | Estado final |

### PlanoTratamento

| Estado Actual | Transições Válidas | Evento de Negócio |
|--------------|-------------------|-------------------|
| `ACTIVO` | `SUSPENSO`, `CONCLUIDO`, `CANCELADO` | Médico suspende / todas as sessões realizadas / cancelamento |
| `SUSPENSO` | `ACTIVO`, `CANCELADO` | Paciente regressa / cancelamento definitivo |
| `CONCLUIDO` | *(nenhuma)* | Estado final — plano completado |
| `CANCELADO` | *(nenhuma)* | Estado final |

### SessaoTratamento

| Estado Actual | Transições Válidas | Evento de Negócio |
|--------------|-------------------|-------------------|
| `AGENDADO` | `REALIZADO`, `FALTOU`, `CANCELADO` | Sessão realizada / paciente faltou / cancelada |
| `FALTOU` | `AGENDADO` | Re-agendamento da sessão falhada |
| `REALIZADO` | *(nenhuma)* | Estado final — sessão concluída |
| `CANCELADO` | *(nenhuma)* | Estado final |

---

## Implementação da máquina de estados (padrão do projecto)

```typescript
// Constantes de transições — definidas a nível de módulo, não inline
const TRANSICOES: Record<EstadoExame, EstadoExame[]> = {
  PENDENTE:  ['AGENDADO', 'CANCELADO'],
  AGENDADO:  ['REALIZADO', 'CANCELADO'],
  REALIZADO: ['LAUDADO'],
  LAUDADO:   [],
  CANCELADO: [],
}

/**
 * Lança AppError 400 se a transição não for válida.
 * Chamar ANTES de qualquer query de actualização.
 */
function assertTransicaoValida(
  actual: EstadoExame,
  destino: EstadoExame
): void {
  const validas = TRANSICOES[actual]
  if (!validas.includes(destino)) {
    throw new AppError(
      400,
      `Não é possível passar de "${actual}" para "${destino}"`
    )
  }
}
```

---

## Lógica de conclusão automática do plano

Quando uma sessão é marcada como `REALIZADO`, verificar se todas as sessões
do plano estão concluídas. Se sim, actualizar o plano para `CONCLUIDO`:

```typescript
// Na sessoes.service.ts — após marcar sessão como REALIZADO:
const totalSessoes = await prisma.sessaoTratamento.count({
  where: { planoId, clinicaId },
})
const sessoesRealizadas = await prisma.sessaoTratamento.count({
  where: { planoId, clinicaId, estado: 'REALIZADO' },
})

if (sessoesRealizadas >= totalSessoes) {
  await prisma.planoTratamento.update({
    where: { id: planoId },
    data: { estado: 'CONCLUIDO', dataFimReal: new Date() },
  })
  // AuditLog de conclusão
  await auditLogService.log({
    clinicaId, entidade: 'PlanoTratamento', entidadeId: planoId,
    accao: 'AUTO_CONCLUIDO', antes: { estado: 'ACTIVO' }, depois: { estado: 'CONCLUIDO' }
  })
}
```
