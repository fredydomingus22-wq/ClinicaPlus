# ClinicaPlus — LangGraph NLU Upgrade Kit
## Pacote de Documentação e Agent Kit | v2.0.0 | Abril 2026

---

## O que é este pacote

Este kit contém toda a documentação necessária para o agente de código (Claude Code) implementar o upgrade do pipeline NLU do ClinicaPlus para LangGraph multi-agent com suporte a múltiplos LLM providers.

---

## Estrutura do Pacote

```
clinicaplus-langgraph-upgrade/
│
├── agent-kit/                    ← Para o agente de código
│   ├── CLAUDE.md                 ← Cérebro: leia primeiro, sempre
│   ├── prompts/
│   │   └── PROMPTS.md            ← Todos os prompts do sistema
│   ├── skills/
│   │   └── SKILLS.md             ← Implementação de cada nó do grafo
│   ├── resources/
│   │   └── RESOURCES.md          ← LLM providers gratuitos + requirements.txt
│   └── references/
│       └── REFERENCES.md         ← Fontes verificadas com URLs
│
└── docs/                         ← Documentação do projecto
    ├── adrs/
    │   ├── ADR-001-langgraph-adoption.md
    │   ├── ADR-002-llm-provider-strategy.md
    │   └── ADR-003-multitenant-isolation.md
    ├── domain/
    │   └── DOMAIN.md             ← Glossário, entidades, fluxos de negócio
    └── module-requirements/
        └── MODULE-REQUIREMENTS.md ← RF, RNF, casos de teste, estimativas
```

---

## Ordem de Leitura para o Agente de Código

1. `agent-kit/CLAUDE.md` — contexto, versões, regras absolutas
2. `agent-kit/prompts/PROMPTS.md` — prompt de execução (PROMPT 06)
3. `agent-kit/skills/SKILLS.md` — implementação de cada nó
4. `agent-kit/resources/RESOURCES.md` — setup de providers LLM
5. `agent-kit/references/REFERENCES.md` — verificação de fontes

---

## Versões Verificadas (Abril 2026)

| Pacote | Versão | Fonte |
|--------|--------|-------|
| langgraph | 1.1.2 | github.com/langchain-ai/langgraph |
| langgraph-checkpoint-postgres | 3.0.5 | pypi.org |
| langchain-cerebras | 0.7.0 | pypi.org |
| Groq llama-3.3-70b-versatile | activo | console.groq.com |
| Gemini 2.5-flash | activo | ai.google.dev |
| **Gemini 2.0-flash** | ⚠️ **DEPRECATED Jun 2026** | ai.google.dev |

---

## Free Tier LLMs para Testes

| Provider | Limite Diário | Velocidade | Cartão? |
|----------|--------------|-----------|---------|
| Groq | 14.400 req/dia | 700+ tok/s | ❌ Não |
| Cerebras | 1M tokens/dia | Ultra-rápido | ❌ Não |
| Gemini | 1.500 req/dia | Médio | ❌ Não |

---

## Gerado por

Claude Sonnet 4.6 com dados verificados em Abril 2026.  
Todas as fontes estão listadas em `agent-kit/references/REFERENCES.md`.
