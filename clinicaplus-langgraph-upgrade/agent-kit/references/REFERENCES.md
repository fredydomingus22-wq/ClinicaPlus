# REFERENCES — Fontes e Documentação Oficial
## ClinicaPlus NLU Agent | Verificado: Abril 2026

Todas as referências foram consultadas directamente. Nenhuma foi gerada por inferência.

---

## LangGraph

| Recurso | URL | Última verificação |
|---------|-----|--------------------|
| Repositório oficial | github.com/langchain-ai/langgraph | Abr 2026 |
| Release 1.1.2 (última) | github.com/langchain-ai/langgraph/releases | Abr 2026 |
| Documentação principal | langchain-ai.github.io/langgraph | Abr 2026 |
| PyPI langgraph | pypi.org/project/langgraph | Abr 2026 |
| PyPI checkpoint-postgres 3.0.5 | pypi.org/project/langgraph-checkpoint-postgres | Abr 2026 |
| PyPI checkpoint base 4.0.1 | pypi.org/project/langgraph-checkpoint | Abr 2026 |
| PyPI langgraph-prebuilt | pypi.org/project/langgraph-prebuilt | Abr 2026 |
| PyPI langgraph-cli 0.4.19 | pypi.org/project/langgraph-cli | Abr 2026 |
| Guia de memória/checkpointing | docs.langchain.com/oss/python/langgraph/add-memory | Abr 2026 |
| Referência checkpointers | reference.langchain.com/python/langgraph/checkpoints | Abr 2026 |

### Notas críticas sobre LangGraph (Abril 2026)
- `AsyncPostgresSaver` requer `psycopg3` (não `psycopg2`)
- Quando usar `psycopg.connect()` manual: obrigatório `autocommit=True` e `row_factory=dict_row`
- `.setup()` cria tabelas `checkpoints` e `checkpoint_blobs` — chamar apenas em migration
- `ToolNode` está em `langgraph.prebuilt` (não importar separado)
- Thread ID é `configurable.thread_id` no config dict do invoke

---

## LLM Providers — Free Tier

### Groq
| Recurso | URL |
|---------|-----|
| Consola (API Key) | console.groq.com |
| FAQ Free Tier | community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790 |
| Rate Limits oficiais | console.groq.com/docs/rate-limits |
| Análise Abril 2026 | grizzlypeaksoftware.com/articles/p/groq-api-free-tier-limits-in-2026 |
| PyPI langchain-groq | pypi.org/project/langchain-groq |
| Compatibilidade OpenAI SDK | api.groq.com/openai/v1 (base URL) |

**Modelos verificados activos (Abril 2026):**
- `llama-3.3-70b-versatile` — qualidade, 30 RPM, 14.400 RPD
- `llama-3.1-8b-instant` — velocidade, 30 RPM, 14.400 RPD

### Cerebras
| Recurso | URL |
|---------|-----|
| Plataforma (API Key) | cloud.cerebras.ai |
| Documentação LangChain | inference-docs.cerebras.ai/integrations/langchain |
| PyPI langchain-cerebras 0.7.0 | pypi.org/project/langchain-cerebras |
| LangChain API Reference | python.langchain.com/api_reference/cerebras |
| Free Tier Summary | pricepertoken.com/endpoints/cerebras/free |
| AI SDK Provider docs | ai-sdk.dev/providers/ai-sdk-providers/cerebras |

**Modelos verificados activos (Abril 2026):**
- `gpt-oss-120b` — modelo principal recomendado
- ⚠️ `llama-3.3-70b` e `qwen-3-32b` — deprecation agendada (verificar antes de usar)

**Limite confirmado:** 1.000.000 tokens/dia no free tier, sem cartão de crédito.

### Google AI Studio / Gemini
| Recurso | URL |
|---------|-----|
| AI Studio (API Key) | aistudio.google.com |
| Pricing oficial (actualizado 1 Abr 2026) | ai.google.dev/gemini-api/docs/pricing |
| Rate Limits oficiais (actualizado 26 Mar 2026) | ai.google.dev/gemini-api/docs/rate-limits |
| Guia billing Março 2026 | blog.laozhang.ai/en/posts/google-gemini-billing-tier-policy-changes |
| Free tier análise completa | aifreeapi.com/en/posts/google-gemini-api-free-tier |
| PyPI langchain-google-genai | pypi.org/project/langchain-google-genai |

**ALERTAS CRÍTICOS (verificados Abril 2026):**
- Gemini 2.0 Flash — **DEPRECATED**, shutdown Junho 2026
- Gemini 2.0 Flash-Lite — **DEPRECATED**, shutdown Junho 2026
- Novos utilizadores (desde 23 Mar 2026): billing prepago obrigatório para paid tier
- Free tier permanece sem cartão mas com limites de RPD

**Modelos free activos:**
- `gemini-2.5-flash` — recomendado (15 RPM, 1.500 RPD, 1M TPM)
- `gemini-2.5-pro` — qualidade máxima (5 RPM, 250 RPD)

---

## FastAPI + Python

| Recurso | URL |
|---------|-----|
| PyPI fastapi | pypi.org/project/fastapi |
| Documentação oficial | fastapi.tiangolo.com |
| PyPI uvicorn | pypi.org/project/uvicorn |

---

## psycopg3 (Postgres driver obrigatório)

| Recurso | URL |
|---------|-----|
| PyPI psycopg | pypi.org/project/psycopg |
| Documentação psycopg3 | www.psycopg.org/psycopg3/docs |

**NOTA:** LangGraph checkpoint postgres requer **psycopg3**, não psycopg2.
Instalar com: `pip install "psycopg[binary]"`

---

## LangChain Core

| Recurso | URL |
|---------|-----|
| `init_chat_model` docs | python.langchain.com/docs/how_to/chat_models_universal_init |
| PyPI langchain-core | pypi.org/project/langchain-core |
| Referência completa Python | python.langchain.com/api_reference |

---

## Evolution API (WhatsApp Gateway)

| Recurso | URL |
|---------|-----|
| Repositório oficial | github.com/EvolutionAPI/evolution-api |
| Documentação | doc.evolution-api.com |
| Webhook events | doc.evolution-api.com/v2/en/webhooks |

**Campos relevantes do webhook:**
```json
{
  "event": "messages.upsert",
  "data": {
    "key": { "remoteJid": "244912345678@s.whatsapp.net" },
    "message": { "conversation": "texto da mensagem" },
    "instanceName": "instance-tenant-id"
  }
}
```

---

## LangSmith (Observabilidade — Opcional mas Recomendado)

| Recurso | URL |
|---------|-----|
| Plataforma | smith.langchain.com |
| Documentação tracing | docs.smith.langchain.com |
| PyPI langsmith | pypi.org/project/langsmith |

**Setup rápido:**
```bash
export LANGCHAIN_TRACING_V2=true
export LANGCHAIN_API_KEY=ls__...
export LANGCHAIN_PROJECT=clinicaplus-nlu
```

---

## Convenção de Verificação

Todos os dados neste documento foram verificados por:
1. Consulta directa às páginas PyPI dos pacotes
2. Consulta às páginas de documentação oficial linkadas
3. Verificação de releases no GitHub da LangChain AI
4. Consulta a páginas de preços e limites dos providers

**Data de verificação:** Abril 2026  
**Responsável:** Documentação gerada para ClinicaPlus v2  
**Próxima revisão recomendada:** Julho 2026 (ou antes de qualquer deploy major)

---

## Sinalizadores de Mudança Rápida

Estas fontes mudam frequentemente — verificar antes de usar:

| Item | Frequência de mudança | Como verificar |
|------|-----------------------|----------------|
| Rate limits Groq | Trimestral | console.groq.com/settings/limits |
| Modelos Cerebras activos | Mensal | inference-docs.cerebras.ai/models |
| Pricing Gemini | Frequente | ai.google.dev/gemini-api/docs/pricing |
| Versão langgraph | Semanal | pypi.org/project/langgraph |
| Modelos deprecados Gemini | Crítico | ai.google.dev/gemini-api/docs/deprecations |
