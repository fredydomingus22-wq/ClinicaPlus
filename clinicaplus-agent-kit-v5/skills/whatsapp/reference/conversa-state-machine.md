# Reference — Máquina de Estados da Conversa

## Diagrama completo

```
                    ┌─────────────────────────────────────┐
                    │           AGUARDA_INPUT              │
                    │   (estado inicial / após reset)      │
                    └──────────────┬──────────────────────┘
                                   │ qualquer mensagem
                                   ▼
                    ┌─────────────────────────────────────┐
                    │         EM_FLUXO_MARCACAO            │
                    │                                      │
                    │  etapaFluxo:                         │
                    │  ESCOLHA_ESPECIALIDADE               │
                    │       → ESCOLHA_MEDICO               │
                    │       → ESCOLHA_HORARIO              │
                    └──────────────┬──────────────────────┘
                                   │ slot escolhido
                                   ▼
                    ┌─────────────────────────────────────┐
                    │       AGUARDA_CONFIRMACAO            │
                    │   "Confirmas? 1-Sim  2-Não"          │
                    └──────┬───────────────────┬──────────┘
                           │ SIM               │ NÃO
                           ▼                   ▼
                    ┌────────────┐     ┌───────────────┐
                    │ CONCLUIDA  │     │   CONCLUIDA   │
                    │ (agendado) │     │ (cancelado)   │
                    └────────────┘     └───────────────┘

                    ┌─────────────────────────────────────┐
                    │             EXPIRADA                 │
                    │  (job horário: sem resposta > 24h)  │
                    └──────────────┬──────────────────────┘
                                   │ nova mensagem
                                   ▼ (reset para INICIO)
                              AGUARDA_INPUT
```

## Contexto acumulado durante o fluxo

```typescript
interface ContextoMarcacao {
  // Preenchido em ESCOLHA_ESPECIALIDADE
  especialidade?: string;
  especialidadesDisponiveis?: string[];
  errosEspecialidade?: number;  // contador de erros

  // Preenchido em ESCOLHA_MEDICO
  medicoId?:   string;
  medicoNome?: string;
  medicosDisponiveis?: Array<{ id: string; nome: string }>;
  errosMedico?: number;

  // Preenchido em ESCOLHA_HORARIO
  slot?:      string;  // ISO 8601 UTC
  slotLabel?: string;  // "Segunda, 14 Abril às 14h" — formatado pt-AO
  slotsDisponiveis?: string[];
  errosHorario?: number;

  // Preenchido no início (se paciente já conhecido)
  pacienteId?:   string;
  pacienteNome?: string;
}
```

## Tratamento de erros e reintentos

```typescript
// Máximo de tentativas por etapa antes de desistir
const MAX_ERROS = 3;

async function tratarRespostaInvalida(
  conversa: WaConversa,
  instanceName: string,
  opcoes: string[],
  tituloEtapa: string,
) {
  const ctx = conversa.contexto as ContextoMarcacao;
  const campoErros = `erros${capitalize(tituloEtapa)}` as keyof ContextoMarcacao;
  const erros = (ctx[campoErros] as number ?? 0) + 1;

  if (erros >= MAX_ERROS) {
    await evolutionApi.enviarTexto(
      instanceName,
      conversa.numeroWhatsapp,
      'Não consegui perceber a tua resposta 😕\nEscreve *oi* para recomeçar.'
    );
    await prisma.waConversa.update({
      where: { id: conversa.id },
      data: { estado: 'CONCLUIDA', etapaFluxo: null },
    });
    return;
  }

  const lista = opcoes.map((o, i) => `${i + 1}. ${o}`).join('\n');
  await evolutionApi.enviarTexto(
    instanceName,
    conversa.numeroWhatsapp,
    `❌ Opção inválida. Responde com um número de 1 a ${opcoes.length}:\n\n${lista}`
  );

  await prisma.waConversa.update({
    where: { id: conversa.id },
    data: { contexto: { ...ctx, [campoErros]: erros } },
  });
}
```

## Criação automática de paciente se número desconhecido

```typescript
// Em etapaConfirmar — antes de criar o agendamento
async function obterOuCriarPaciente(
  numero: string,
  clinicaId: string,
  nomeWhatsapp: string,  // pushName da Evolution API
): Promise<string> {
  // Normalizar número: "244923456789" → "+244923456789" para lookup
  const telefone = `+${numero}`;

  let paciente = await prisma.paciente.findFirst({
    where: { clinicaId, telefone },
    select: { id: true },
  });

  if (!paciente) {
    // Criar paciente com dados mínimos — clínica pode completar depois
    paciente = await prisma.paciente.create({
      data: {
        clinicaId,
        nome:     nomeWhatsapp || `Paciente WA ${numero.slice(-4)}`,
        telefone,
        origem:   'WHATSAPP',  // novo campo para rastrear origem
      },
      select: { id: true },
    });
  }

  return paciente.id;
}
```
