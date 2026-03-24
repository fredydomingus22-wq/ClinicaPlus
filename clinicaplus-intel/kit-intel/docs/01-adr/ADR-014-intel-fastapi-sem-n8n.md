# ADR-014 — Serviço de Inteligência: FastAPI Python Directo (sem n8n no caminho crítico)

**Data:** 2026-03-24
**Status:** ACEITE — substitui parcialmente ADR-012 (D2, D3, D4)
**Decisores:** ClinicaPlus Core Team
**Contexto:** Revisão arquitectural pós-análise de segurança e fiabilidade do n8n

---

## Contexto

O ADR-012 definiu o n8n como motor de automação principal para o módulo WhatsApp. Após análise aprofundada, identificámos 4 problemas críticos que inviabilizam este uso em produção com dados de saúde:

**Problema 1 — Segurança (CVE-2026-21858, CVSS 9.9):**
Vulnerabilidade de RCE não autenticado descoberta em Janeiro 2026. Um n8n self-hosted comprometido tem acesso a todas as credenciais da infraestrutura — Evolution API, PostgreSQL, TypeScript API. Para dados de pacientes, este risco é inaceitável.

**Problema 2 — Memory leaks documentados em webhooks:**
O nó Webhook do n8n não tem rate limiting nativo. Sob concorrência (5 clínicas × 20 conversas simultâneas = 100 webhooks/minuto), a instância entra em estado de memória corrompido e começa a falhar em 2-7ms por execução.

**Problema 3 — Vazamento de dados entre sessões:**
Bug documentado em produção: execuções concorrentes de workflows triggered por webhook partilham contexto inesperadamente. O paciente A pode ver dados do paciente B. Em contexto de saúde, isto é uma violação de dados.

**Problema 4 — Lógica stateful no lugar errado:**
O n8n foi desenhado para workflows lineares e integrações simples — não para máquinas de estado multi-turno com lógica de negócio complexa (NLU → DST → Policy). A lógica dispersa em nós visuais é impossível de testar e versionar.

---

## Decisão

### D1 — Arquitectura: FastAPI Python como único receptor de webhooks WhatsApp

A Evolution API envia webhooks directamente ao `clinicaplus-intel` (FastAPI Python, Railway), eliminando o n8n do caminho crítico.

```
ANTES (ADR-012):
Evolution API → n8n → TypeScript API → Evolution API

DEPOIS (ADR-014):
Evolution API → FastAPI Python (intel) → TypeScript API → Evolution API
```

O Python é o único ponto de entrada. Recebe a mensagem, corre o pipeline completo, e responde — tudo numa única request assíncrona com latência < 100ms.

### D2 — n8n: relegado a jobs assíncronos de baixo risco

O n8n permanece na infraestrutura mas apenas para tarefas onde um crash não afecta pacientes em tempo real:

| Tarefa | n8n |
|--------|-----|
| Webhook de mensagens WhatsApp | ❌ Removido |
| Lembretes de consulta (job nocturno) | ✅ Mantido |
| Relatórios semanais | ✅ Mantido |
| Notificações internas | ✅ Mantido |
| Retreino do modelo de no-show | ✅ Mantido |

### D3 — Pipeline de inteligência: NLU → DST → Policy → DB → NLG

O `clinicaplus-intel` implementa um Task-Oriented Dialogue (TOD) system completo:

```
Mensagem WhatsApp
    ↓
NLU  — extracção de intenção + slots (especialidade, médico, data, período)
    ↓
DST  — dialogue state tracking (que slots estão preenchidos vs em falta)
    ↓
Policy — decide próxima acção (saltar etapas, pedir slot, mostrar alternativas)
    ↓
DB Layer — asyncpg directo ao PostgreSQL (reads apenas)
    ↓
NLG  — gera mensagem pt-AO + estrutura Poll para Evolution API
    ↓
Evolution API — envia Poll nativa (paciente toca, não escreve números)
```

### D4 — UX: Polls nativas WhatsApp em vez de listas numeradas

`sendButtons` e `sendList` estão quebrados no Baileys (retornam 201 mas mensagem não entregue). A alternativa correcta são **Polls nativas** via `sendPoll`, tratadas via evento `POLL_UPDATE` no webhook — não `MESSAGES_UPSERT`.

O paciente nunca escreve "1", "2", "3". Toca numa opção.

### D5 — Escrita: TypeScript API como fonte de verdade

O Python faz apenas reads à DB (asyncpg directo). Writes (criar agendamento, actualizar estado, criar paciente) são sempre delegados ao TypeScript API via HTTP interno. Isto preserva toda a lógica de validação, RBAC, e event bus do TypeScript.

### D6 — Modelo de no-show: heurística agora, XGBoost depois

Fase 0 (lançamento): heurística determinística calibrada para Angola.
Fase 1 (3-6 meses, 100+ amostras): LogisticRegression com dados reais.
Fase 2 (6+ meses, 200+ amostras): XGBoost com SMOTE.

Transição automática: o predictor.py carrega o modelo se AUC ≥ 0.68 e n ≥ 150, senão usa heurística — sem intervenção manual.

---

## Consequências

**Ganhos:**
- Zero risco de CVEs do n8n no caminho crítico de dados de saúde
- Latência reduzida: < 100ms por mensagem (vs 400-800ms com n8n)
- Isolamento perfeito de sessões: cada request Python é stateless — o estado vive na DB
- Testabilidade: toda a lógica em Python com Pytest, cobertura 85%+
- Versionamento: lógica de negócio em Git, não em workflows visuais

**Custos:**
- Novo Railway service: `clinicaplus-intel` (~$10/mês)
- Configuração do webhook da Evolution API muda de n8n para intel URL
- ADR-012 D2, D3, D4 parcialmente invalidados (D1, D5 mantidos)

---

## Estrutura do serviço

```
clinicaplus-intel/
├── main.py                    # FastAPI app + webhook endpoint
├── nlu/
│   └── pipeline.py            # Intenção + extracção de slots
├── dst/
│   └── tracker.py             # Dialogue State Tracker
├── policy/
│   └── dialogue_policy.py     # Lógica de decisão
├── nlg/
│   └── generator.py           # Templates de mensagem pt-AO
├── db/
│   └── layer.py               # asyncpg queries (reads) + WaFormatter
├── noshow/
│   ├── heuristica.py          # Fase 0
│   ├── predictor.py           # Switch heurística ↔ modelo
│   └── trainer.py             # Treino XGBoost quando há dados
├── routers/
│   ├── webhook.py             # POST /webhook/whatsapp
│   ├── health.py              # GET /health
│   └── admin.py               # GET /intel/stats (painel admin)
└── requirements.txt
```

---

## Referências

- CVE-2026-21858: https://nvd.nist.gov/vuln/detail/CVE-2026-21858
- n8n concurrent webhook memory issue: github.com/n8n-io/n8n/issues/
- Evolution API sendPoll docs: doc.evolution-api.com/v2/api-reference/message-controller/send-poll
- Task-Oriented Dialogue systems: ACL 2024 survey on TOD without LLMs
