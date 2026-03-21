# User Stories & Use Cases — Módulo WhatsApp

> Audiência: product, desenvolvimento, QA  
> Formato: User Stories com critérios de aceitação + Use Cases detalhados  
> Versão: v1.0 — 2026-03-18

---

## Actores

| Actor | Quem é | O que quer |
|-------|--------|-----------|
| **Admin** | Dono ou gestor da clínica | Ligar o WhatsApp ao sistema e activar automações |
| **Recepcionista** | Staff da clínica | Ver agendamentos que chegam via WhatsApp |
| **Paciente** | Cliente da clínica | Marcar consulta pelo WhatsApp sem ligar para a clínica |
| **Sistema** | ClinicaPlus backend | Enviar lembretes automáticos e processar respostas |

---

## Épico 1 — Conexão WhatsApp (Admin)

### US-01 — Ligar número WhatsApp à clínica

**Como** Admin da clínica  
**Quero** ligar um número WhatsApp ao ClinicaPlus através de QR code  
**Para que** os pacientes possam contactar a clínica via WhatsApp automaticamente

**Critérios de aceitação:**
- [ ] Ao entrar em Configurações → WhatsApp, vejo o estado actual da conexão
- [ ] Se não estiver ligado, vejo um botão "Conectar WhatsApp"
- [ ] Ao clicar, aparece um QR code com instruções claras de como escanear
- [ ] O QR code actualiza-se automaticamente de 60 em 60 segundos se não for escaneado
- [ ] Após escanear com o telemóvel, o ecrã muda automaticamente para "Conectado" (sem refresh manual)
- [ ] Vejo o número de telefone ligado e a data de conexão
- [ ] Se o plano for BASICO, o botão está desactivado com mensagem de upgrade

**Regras de negócio:**
- Plano PRO: máximo 1 número WhatsApp por clínica
- Plano ENTERPRISE: sem limite de números
- QR code expira em 60 segundos — regenerar automaticamente
- Sessão WhatsApp dura ~14 dias sem actividade — reconectar é esperado

---

### US-02 — Ver estado da conexão em tempo real

**Como** Admin  
**Quero** ver o estado actual da conexão WhatsApp actualizado em tempo real  
**Para que** saiba imediatamente se o bot está operacional ou precisa de atenção

**Critérios de aceitação:**
- [ ] Badge verde "Conectado" com número de telefone quando sessão activa
- [ ] Badge amarelo "A reconectar..." quando sessão temporariamente perdida
- [ ] Badge vermelho "Desconectado" com botão "Reconectar" quando sessão encerrada
- [ ] A mudança de estado aparece sem refresh da página (WebSocket)
- [ ] Tooltip no badge mostra data da última actividade

---

### US-03 — Desligar o WhatsApp

**Como** Admin  
**Quero** poder desligar o número WhatsApp quando necessário  
**Para que** possa mudar de número ou pausar as automações temporariamente

**Critérios de aceitação:**
- [ ] Botão "Desligar" visível quando estado é CONECTADO
- [ ] Modal de confirmação antes de desligar: "Desligar irá pausar todas as automações. Confirmas?"
- [ ] Após desligar, estado muda para DESCONECTADO e botão "Conectar WhatsApp" aparece
- [ ] Automações ficam configuradas mas inactivas (não perder configuração)
- [ ] Aviso: "Conversas em curso serão interrompidas"

---

### US-04 — Gerir múltiplos números (ENTERPRISE)

**Como** Admin de clínica ENTERPRISE com múltiplas localizações  
**Quero** ligar um número WhatsApp diferente por localização  
**Para que** cada unidade tenha o seu canal próprio de marcações

**Critérios de aceitação:**
- [ ] Botão "Adicionar número" visível para ENTERPRISE (sem limite)
- [ ] Para PRO: botão desactivado após 1 número, com mensagem "Upgrade para Enterprise para múltiplos números"
- [ ] Lista de números com estado individual (Conectado / Desconectado) por localização
- [ ] Cada número tem as suas automações configuradas de forma independente
- [ ] Nome da localização editável por número (ex: "Filial Miramar", "Sede Talatona")

---

## Épico 2 — Automações (Admin)

### US-05 — Activar automação de marcação de consultas

**Como** Admin  
**Quero** activar o fluxo de marcação automática via WhatsApp  
**Para que** pacientes possam marcar consultas a qualquer hora sem depender da recepcionista

**Critérios de aceitação:**
- [ ] Toggle "Marcação de Consultas" visível na lista de automações
- [ ] Toggle desactivado (cinzento) se WhatsApp não estiver CONECTADO
- [ ] Tooltip: "Liga o WhatsApp primeiro para activar automações"
- [ ] Ao activar, aparecem campos de configuração: horário de funcionamento, mensagem de fora de horário
- [ ] Campos têm valores default prontos a usar
- [ ] Botão "Guardar" só aparece se houver alterações não guardadas
- [ ] Após guardar, confirmação: "Automação activa. Pacientes já podem marcar via WhatsApp."
- [ ] Se o processo de activação falhar (n8n erro), mostrar mensagem de erro com opção de tentar novamente

**Configuração obrigatória:**
- Horário de início e fim (default: 08:00–18:00)
- Dias da semana activos (default: segunda a sexta)
- Mensagem de fora de horário (texto com variáveis {inicio}, {fim})

---

### US-06 — Configurar lembretes automáticos

**Como** Admin  
**Quero** configurar mensagens automáticas de lembrete antes das consultas  
**Para que** os pacientes não falhem as consultas e a clínica reduza faltas

**Critérios de aceitação:**
- [ ] Toggle "Lembrete 24h antes" com template de mensagem editável
- [ ] Toggle "Lembrete 2h antes" com template editável
- [ ] Variáveis disponíveis documentadas abaixo do campo: {nome}, {data}, {hora}, {medico}, {clinica}
- [ ] Preview da mensagem com dados de exemplo ao editar
- [ ] Aviso: "Pacientes sem número de telefone não receberão lembretes"
- [ ] Contador: "X pacientes com consultas amanhã terão lembrete" (actualizado em tempo real)

---

### US-07 — Activar confirmação/cancelamento por resposta

**Como** Admin  
**Quero** que pacientes possam confirmar ou cancelar consultas respondendo ao lembrete  
**Para que** possa gerir a agenda de forma mais eficiente e libertar slots cancelados

**Critérios de aceitação:**
- [ ] Toggle "Confirmação por resposta" (dependente dos lembretes — aviso se lembretes desactivados)
- [ ] Campos: mensagem de consulta confirmada, mensagem de consulta cancelada
- [ ] Quando paciente cancela: agendamento muda de estado para CANCELADO no sistema
- [ ] Admin vê no painel em tempo real (via WebSocket): "João cancelou a consulta de amanhã"
- [ ] Slot cancelado fica disponível para outras marcações

---

## Épico 3 — Marcação via WhatsApp (Paciente)

### US-08 — Marcar consulta via WhatsApp

**Como** Paciente  
**Quero** marcar uma consulta enviando uma mensagem para o WhatsApp da clínica  
**Para que** possa marcar fora do horário de atendimento sem ligar para a clínica

**Critérios de aceitação:**
- [ ] Ao enviar qualquer mensagem para o número da clínica, recebo uma resposta do bot
- [ ] O bot apresenta-me as especialidades disponíveis numa lista numerada
- [ ] Respondo com o número da especialidade e o bot mostra os médicos dessa especialidade
- [ ] Escolho o médico e o bot mostra os próximos horários disponíveis (máx 5)
- [ ] Confirmo o horário e o bot pede confirmação final (SIM/NÃO)
- [ ] Após confirmar, recebo mensagem de confirmação com data, hora e médico
- [ ] O agendamento aparece no painel da clínica em tempo real

**Comportamento de erro:**
- [ ] Resposta inválida: bot repete a pergunta com mensagem "❌ Opção inválida. Escolhe 1 a N."
- [ ] Após 3 erros consecutivos: "Não consegui perceber. Escreve *oi* para recomeçar."
- [ ] Fora do horário: mensagem de fora de horário e nenhum fluxo iniciado

---

### US-09 — Reiniciar fluxo de marcação

**Como** Paciente  
**Quero** poder recomeçar o processo de marcação se me enganei  
**Para que** não fique preso num fluxo errado

**Critérios de aceitação:**
- [ ] Escrever "oi", "olá", "marcar", "0" em qualquer ponto reinicia o fluxo
- [ ] Ao reiniciar: "Vamos recomeçar! 😊" + lista de especialidades
- [ ] Dados da sessão anterior são limpos
- [ ] Conversa expirada (sem resposta > 24h): reiniciar automaticamente na próxima mensagem

---

### US-10 — Confirmar consulta pelo lembrete

**Como** Paciente  
**Quero** confirmar ou cancelar a minha consulta respondendo à mensagem de lembrete  
**Para que** não precise de ligar para a clínica

**Critérios de aceitação:**
- [ ] Recebo mensagem de lembrete 24h antes da consulta
- [ ] A mensagem pede que responda 1 para confirmar ou 2 para cancelar
- [ ] Ao responder 1: "✅ Consulta confirmada! Até logo, {nome}."
- [ ] Ao responder 2: "Consulta cancelada. Se precisares de remarcar escreve *marcar*."
- [ ] Resposta inválida: "Responde *1* para confirmar ou *2* para cancelar."
- [ ] Se não responder: segunda lembrete 2h antes (se activado)

---

## Épico 4 — Visibilidade para a Clínica (Recepcionista/Admin)

### US-11 — Ver actividade recente do WhatsApp

**Como** Recepcionista ou Admin  
**Quero** ver em tempo real as marcações e interacções que chegam via WhatsApp  
**Para que** esteja sempre a par do que está a acontecer sem precisar de monitorizar o telemóvel

**Critérios de aceitação:**
- [ ] Feed "Actividade recente" no painel WhatsApp com as últimas 20 interacções
- [ ] Cada item: tipo (Marcação / Lembrete / Confirmação / Cancelamento) + paciente + hora
- [ ] Novas entradas aparecem em tempo real sem refresh (via WebSocket)
- [ ] Clicar num item abre o detalhe do agendamento em questão
- [ ] Badge de contador no menu lateral: "3 novas marcações via WA hoje"

---

### US-12 — Distinguir agendamentos por canal

**Como** Recepcionista  
**Quero** saber quais agendamentos foram feitos via WhatsApp vs. presencialmente  
**Para que** possa gerir melhor a origem das marcações e analisar o impacto do bot

**Critérios de aceitação:**
- [ ] Badge "WA" (verde) nos agendamentos criados via WhatsApp na agenda do dia
- [ ] Filtro "Canal: WhatsApp / Portal / Presencial" na lista de agendamentos
- [ ] Relatório de receita mostra breakdown por canal (PRO+)

---

## Limites por plano — tabela definitiva

| Limite | BASICO | PRO | ENTERPRISE |
|--------|--------|-----|------------|
| Números WhatsApp | 0 | 1 | ilimitado |
| Automação: Marcação | ❌ | ✅ | ✅ |
| Automação: Lembrete 24h | ❌ | ✅ | ✅ |
| Automação: Lembrete 2h | ❌ | ✅ | ✅ |
| Automação: Confirmação | ❌ | ✅ | ✅ |
| Automação: Boas-vindas | ❌ | ✅ | ✅ |
| Feed actividade | ❌ | ✅ (últimas 20) | ✅ (ilimitado) |
| Histórico de conversas | ❌ | ✅ (7 dias) | ✅ (90 dias) |
| Badge "WA" na agenda | ❌ | ✅ | ✅ |

---

## Comportamentos de estado — especificação completa

### Estados da instância WhatsApp

```
DESCONECTADO
  → UI: card cinzento, botão "Conectar WhatsApp" azul
  → Automações: todos os toggles disabled com tooltip "Liga o WhatsApp primeiro"
  → Acção do admin: clicar "Conectar WhatsApp"

AGUARDA_QR
  → UI: card amarelo/laranja, QR code exibido, instruções passo a passo
  → Timer: countdown 60s para expiração do QR
  → Auto-refresh: novo QR gerado automaticamente ao expirar (sem clique)
  → Botão: "Cancelar" para voltar a DESCONECTADO
  → Automações: todos os toggles disabled

CONECTADO
  → UI: card verde, número de telefone, data de conexão
  → Botão: "Desligar" (com confirmação)
  → Automações: toggles activos conforme configuração
  → Badge: ● verde no header da secção

ERRO
  → UI: card vermelho, mensagem de erro específica
  → Botão: "Tentar novamente" + "Ver logs" (só para ENTERPRISE)
  → Automações: todos os toggles disabled
  → Notificação por email ao admin (se configurado)
```

### Transições de estado (diagrama)

```
                    [Conectar WhatsApp]
DESCONECTADO ─────────────────────────► AGUARDA_QR
     ▲                                      │
     │ [Desligar] ou [Cancelar]             │ QR escaneado com sucesso
     │                                      ▼
     ◄──────── CONECTADO ◄─────────────────────
                   │ \
                   │  \── sessão expira (~14 dias)
                   │        │
                   │        ▼
                   │     AGUARDA_QR (reconexão automática pedida)
                   │
                   └── erro de rede/ban → ERRO
```

### Comportamento quando sessão expira (sem acção do admin)

A sessão Baileys expira naturalmente ao fim de ~14 dias. O comportamento esperado:

1. Evolution API detecta desconexão → envia webhook `CONNECTION_UPDATE` com `state: "close"`
2. Sistema actualiza instância para DESCONECTADO
3. Admin recebe notificação push + email: "O WhatsApp da sua clínica desconectou. Clica aqui para reconectar."
4. Automações pausam automaticamente (sem erros — silencioso)
5. Conversas em curso ficam em AGUARDA_INPUT até reconexão

---

## Use Cases técnicos detalhados

### UC-01 — Fluxo completo de conexão por QR code

```
Pré-condição: Admin autenticado, plano PRO, sem instância activa

1. Admin navega para Configurações → WhatsApp
   SISTEMA: carrega GET /api/whatsapp/instancias/estado
   → estado: DESCONECTADO → mostra botão "Conectar WhatsApp"

2. Admin clica "Conectar WhatsApp"
   SISTEMA: POST /api/whatsapp/instancias
   → cria instância na Evolution API (evolutionName gerado)
   → obtém QR code (base64)
   → guarda WaInstancia com estado AGUARDA_QR
   → emite WebSocket 'whatsapp:qrcode' com { qrCode, expiresAt }
   → frontend recebe via useSocketEvent e exibe QR code

3. Frontend mostra:
   ┌────────────────────────────────────┐
   │  Escaneia o QR Code               │
   │                                   │
   │        [QR CODE 200x200]          │
   │                                   │
   │  ⏱ Expira em 58s                  │
   │                                   │
   │  1. Abre o WhatsApp               │
   │  2. Toca em ⋮ → Dispositivos      │
   │  3. Toca "Ligar dispositivo"      │
   │  4. Aponta a câmara aqui          │
   │                                   │
   │           [Cancelar]              │
   └────────────────────────────────────┘

4. QR code expira sem ser escaneado (60s)
   SISTEMA: Evolution API emite webhook QRCODE_UPDATED com novo QR
   → waInstanciaService.processarQrCode() chamado
   → frontend recebe WebSocket e actualiza QR automaticamente
   → countdown reinicia para 60s

5. Admin escaneia QR com telemóvel
   SISTEMA: Evolution API detecta conexão → webhook CONNECTION_UPDATE { state: "open", number: "+244923456789" }
   → waInstanciaService.processarConexao() chamado
   → instância actualizada para CONECTADO com numeroTelefone
   → qrCodeBase64 apagado da DB
   → publishEvent 'whatsapp:estado' → frontend actualiza para estado CONECTADO

6. Frontend muda para:
   ┌────────────────────────────────────┐
   │  ● Conectado                      │
   │  +244 923 456 789                 │
   │  Desde: hoje às 14h32             │
   │                              [Desligar] │
   └────────────────────────────────────┘

7. Automações ficam disponíveis para configurar

Pós-condição: WaInstancia.estado = CONECTADO, automações activáveis
```

---

### UC-02 — Activar automação de marcação

```
Pré-condição: instância CONECTADA, plano PRO

1. Admin vê card "🗓 Marcação de Consultas" com toggle OFF (cinzento)

2. Admin clica o toggle
   FRONTEND: optimistic update → toggle muda para ON imediatamente
   SISTEMA: POST /api/whatsapp/automacoes/:id/activar
   → waAutomacaoService.activar() chamado
   → gera/reutiliza API key interna (scope WRITE_AGENDAMENTOS)
   → n8nApi.criarWorkflow('MARCACAO_CONSULTA', vars)
     → template TypeScript gera JSON do workflow n8n
     → POST /api/v1/workflows ao n8n (cria workflow)
     → POST /api/v1/workflows/:id/activate ao n8n (activa)
   → WaAutomacao actualizada: ativo=true, n8nWorkflowId, n8nWebhookPath
   → auditLog registado

3. Se sucesso:
   → Toast verde: "✅ Automação de marcação activada!"
   → Campos de configuração expandem abaixo do toggle

4. Se erro (n8n em baixo):
   → Optimistic update revertido (toggle volta a OFF)
   → Toast vermelho: "Não foi possível activar. Tenta novamente."
   → Botão "Tentar novamente" no card

5. Admin configura horários e mensagens
   SISTEMA: PATCH /api/whatsapp/automacoes/:id com configuracao
   → Se estava activa: recria workflow no n8n com nova config
   → Toast: "Configuração guardada"

Pós-condição: workflow n8n activo, Evolution API a enviar mensagens para o webhook do n8n
```

---

### UC-03 — Paciente marca consulta via WhatsApp (fluxo completo)

```
Pré-condição: automação MARCACAO_CONSULTA activa, horário dentro do configurado

1. Paciente envia "Quero marcar uma consulta" para o WhatsApp da clínica
   EVOLUTION API: recebe mensagem → webhook POST para n8n (wa-marcacao-{slug})
   N8N: verifica que fromMe=false e não é grupo
   N8N: GET /api/whatsapp/fluxo/conversa?numero=244923456789
   SISTEMA: conversa não existe ou AGUARDA_INPUT → null/AGUARDA_INPUT
   N8N: POST /api/whatsapp/fluxo/inicio com { numero, instanceName, pushName: "João" }
   SISTEMA: etapaInicio()
   → cria WaConversa com etapaFluxo: ESCOLHA_ESPECIALIDADE
   → busca especialidades activas da clínica
   → evolutionApi.enviarTexto() com lista

2. Paciente recebe:
   "Olá, João! 👋 Bem-vindo à Clínica Multipla.
    Escolhe a especialidade:
    1. Cardiologia
    2. Pediatria
    3. Ortopedia
    Responde com o número da opção."

3. Paciente responde "2"
   N8N: recebe mensagem → GET conversa → etapaFluxo: ESCOLHA_ESPECIALIDADE
   N8N: POST /api/whatsapp/fluxo/especialidade { resposta: "2", ... }
   SISTEMA: etapaEspecialidade()
   → valida input: 2 é válido (Pediatria)
   → busca médicos em Pediatria
   → envia lista de médicos

4. Paciente recebe:
   "Médicos disponíveis em *Pediatria*:
    1. Dr(a). Maria Lopes — 3.500 Kz
    2. Dr(a). Sofia Mendes — 4.000 Kz
    Escolhe o médico."

5. Paciente responde "1"
   SISTEMA: etapaMedico()
   → busca próximos 5 slots disponíveis do Dr(a). Maria Lopes
   → envia lista de slots formatados em pt-AO

6. Paciente recebe:
   "Próximas vagas com *Dr(a). Maria Lopes*:
    1. Segunda-feira, 20 de Março às 09:00
    2. Segunda-feira, 20 de Março às 10:00
    3. Terça-feira, 21 de Março às 11:30
    4. Quarta-feira, 22 de Março às 09:00
    5. Quinta-feira, 23 de Março às 14:00
    Escolhe o horário."

7. Paciente responde "3"
   SISTEMA: etapaHorario()
   → slot: "2026-03-21T11:30:00.000Z"
   → conversa vai para AGUARDA_CONFIRMACAO

8. Paciente recebe:
   "Confirmas a consulta?
    📅 Terça-feira, 21 de Março às 11:30
    👩‍⚕️ Dr(a). Maria Lopes
    Responde *1* para confirmar ou *2* para cancelar."

9. Paciente responde "sim"
   SISTEMA: etapaConfirmar()
   → /^[1sS]/.test("sim") → true → confirmar
   → obterOuCriarPaciente("244923456789", clinicaId, conversa)
     → telefone "+244923456789" não existe → cria paciente com origem: WHATSAPP
   → agendamentosService.create({ canal: "WHATSAPP", ... })
     → agendamento criado com ID
   → conversa → CONCLUIDA
   → publishEvent 'whatsapp:marcacao' → admin vê em tempo real no painel

10. Paciente recebe:
    "✅ *Consulta marcada com sucesso!*
     📅 Terça-feira, 21 de Março às 11:30
     👩‍⚕️ Dr(a). Maria Lopes
     Receberás um lembrete 24h antes. Até lá! 🙏"

11. No painel da clínica, recepcionista vê:
    [● WA] João Silva — Terça, 21 Mar 11:30 — Dr(a). Maria Lopes

Pós-condição: agendamento criado, paciente criado se novo, conversa CONCLUIDA
```

---

### UC-04 — Lembrete automático e confirmação

```
Pré-condição: agendamento CONFIRMADO amanhã, automação LEMBRETE_24H activa

1. Job às 07:00 (Africa/Luanda)
   SISTEMA: jobLembrete24h()
   → busca agendamentos de amanhã com instância CONECTADA e automação activa
   → para agendamento do João:
     POST para webhook n8n lembrete: {
       agendamentoId, numero: "244923456789",
       nome: "João Silva", data: "21 de Março",
       hora: "11:30", medico: "Maria Lopes"
     }

2. João recebe (às 07:00):
   "Olá, João! 👋 Lembrete da consulta amanhã às *11:30* com *Dr(a). Maria Lopes*.
    Confirmas? Responde *1* para confirmar ou *2* para cancelar."

3. João responde "1" (às 09:45)
   N8N: recebe → GET conversa → estado: AGUARDA_CONFIRMACAO
   N8N: POST /api/whatsapp/fluxo/confirmar { resposta: "1", ... }
   SISTEMA: etapaConfirmar()
   → agendamento actualizado: estado = CONFIRMADO (já estava — idempotente)
   → conversa → CONCLUIDA

4. João recebe:
   "✅ Consulta confirmada! Até logo, João."

5. Recepcionista vê no painel:
   ✅ João Silva confirmou a consulta de amanhã (via WhatsApp)

Variante — Cancelamento:
3b. João responde "2"
    SISTEMA: agendamento actualizado: estado = CANCELADO
    → slot fica disponível para nova marcação
    → conversa → CONCLUIDA

4b. João recebe:
    "Consulta cancelada. Se precisares de remarcar escreve *marcar*."
```

---

### UC-05 — Plano insuficiente (BASICO tenta activar WhatsApp)

```
1. Admin de clínica BASICO acede a Configurações → WhatsApp
   FRONTEND: carrega página

2. Admin vê:
   ┌────────────────────────────────────────────────────────────┐
   │  WhatsApp & Automações                     [Upgrade ▲]    │
   │                                                           │
   │  ⚠ Esta funcionalidade requer o plano PRO ou superior.   │
   │                                                           │
   │  Com o plano PRO podes:                                   │
   │  ✓ Ligar um número WhatsApp à tua clínica                 │
   │  ✓ Marcações automáticas 24/7                             │
   │  ✓ Lembretes automáticos antes das consultas              │
   │  ✓ Confirmações/cancelamentos via resposta                │
   │                                                           │
   │            [Ver planos e preços]                          │
   └────────────────────────────────────────────────────────────┘

3. API: se admin tentar POST /api/whatsapp/instancias
   → 402 PLAN_UPGRADE_REQUIRED
   → frontend nunca chega aqui pois PlanGate bloqueou

Pós-condição: admin não consegue activar, vê proposta de upgrade clara
```
