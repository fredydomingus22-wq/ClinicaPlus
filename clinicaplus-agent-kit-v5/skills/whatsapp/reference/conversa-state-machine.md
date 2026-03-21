# Reference — Máquina de Estados da Conversa WhatsApp

## Diagrama de estados

```
                       qualquer mensagem
AGUARDA_INPUT  ──────────────────────────────► etapaInicio()
    ▲                                               │
    │ EXPIRADA + nova msg                           │ envia lista especialidades
    │                                               ▼
EXPIRADA       ◄── job (24h sem resposta) ── ESCOLHA_ESPECIALIDADE
                                                    │
                                    input válido    │    input inválido (máx 3x)
                                                    │         → repetir etapa
                                                    ▼
                                          ESCOLHA_MEDICO
                                                    │
                                                    ▼
                                         ESCOLHA_HORARIO
                                                    │
                                                    ▼
                                       AGUARDA_CONFIRMACAO
                                          │         │
                                    SIM   │         │ NÃO
                                          ▼         ▼
                                       CONCLUIDA (agendado / cancelado)
```

## Etapas e transições válidas

| etapaFluxo actual | Mensagem recebida | Próxima etapa | Acção |
|-------------------|-------------------|---------------|-------|
| null / qualquer | "marcar" ou "oi" | ESCOLHA_ESPECIALIDADE | etapaInicio() |
| ESCOLHA_ESPECIALIDADE | número 1-N | ESCOLHA_MEDICO | etapaEspecialidade() |
| ESCOLHA_ESPECIALIDADE | inválido | ESCOLHA_ESPECIALIDADE | contador erros++ |
| ESCOLHA_MEDICO | número 1-N | ESCOLHA_HORARIO | etapaMedico() |
| ESCOLHA_MEDICO | inválido | ESCOLHA_MEDICO | contador erros++ |
| ESCOLHA_HORARIO | número 1-N | AGUARDA_CONFIRMACAO | etapaHorario() |
| ESCOLHA_HORARIO | inválido | ESCOLHA_HORARIO | contador erros++ |
| AGUARDA_CONFIRMACAO | 1 / s / sim | — | etapaConfirmar() → criar agendamento → CONCLUIDA |
| AGUARDA_CONFIRMACAO | 2 / n / não | — | etapaConfirmar() → cancelar → CONCLUIDA |
| AGUARDA_CONFIRMACAO | inválido | AGUARDA_CONFIRMACAO | enviar "Responde 1 ou 2" |
| 3 erros consecutivos | qualquer | CONCLUIDA | enviar mensagem de desistência |

## Comandos especiais (qualquer etapa)

```typescript
const COMANDOS_RESET = ['oi', 'olá', 'ola', 'marcar', 'iniciar', 'comecar', 'começar', '0'];

function isComandoReset(texto: string): boolean {
  return COMANDOS_RESET.includes(texto.toLowerCase().trim());
}
// Se isComandoReset(texto) → chamar etapaInicio() independentemente da etapa actual
```

## Contexto acumulado (shape completo)

```typescript
interface ContextoMarcacao {
  // Preenchido em etapaEspecialidade
  especialidade?:         string;
  medicosDisponiveis?:    string[];  // array de medicoIds
  errosEspecialidade?:    number;

  // Preenchido em etapaMedico
  medicoId?:              string;
  medicoNome?:            string;
  slotsDisponiveis?:      string[];  // ISO 8601 UTC strings
  errosMedico?:           number;

  // Preenchido em etapaHorario
  slot?:                  string;   // ISO 8601 UTC
  slotLabel?:             string;   // "Segunda, 14 de Abril às 14:00"
  errosHorario?:          number;

  // Preenchido em etapaConfirmar (se paciente novo)
  pacienteId?:            string;
}
```

## Formatação de mensagens pt-AO

```typescript
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';  // pt-BR é o mais próximo de pt-AO disponível

function formatSlotPtAO(isoString: string): string {
  const d = new Date(isoString);
  // "Segunda-feira, 14 de Abril às 14:00"
  return format(d, "EEEE, d 'de' MMMM 'às' HH:mm", { locale: ptBR });
}

function formatKz(valor: number): string {
  return new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' })
    .format(valor)
    .replace('AOA', 'Kz');
}
```

## Verificação de horário configurado

```typescript
function estaNoHorario(cfg: ConfigMarcacao): boolean {
  const agora = new Date();
  const diaSemana = agora.getDay();  // 0=dom, 1=seg, ..., 6=sab

  if (!cfg.diasAtivos.includes(diaSemana)) return false;

  const [hInicio, mInicio] = cfg.horarioInicio.split(':').map(Number);
  const [hFim, mFim]       = cfg.horarioFim.split(':').map(Number);

  // Usar timezone Africa/Luanda
  const luandaAgora = new Date(agora.toLocaleString('en-US', { timeZone: 'Africa/Luanda' }));
  const minutosAgora = luandaAgora.getHours() * 60 + luandaAgora.getMinutes();
  const minutosInicio = hInicio * 60 + mInicio;
  const minutosFim    = hFim * 60 + mFim;

  return minutosAgora >= minutosInicio && minutosAgora < minutosFim;
}
```
