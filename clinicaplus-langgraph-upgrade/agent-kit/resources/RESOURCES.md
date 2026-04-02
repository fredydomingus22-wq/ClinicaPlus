# RESOURCES — LLM Providers Gratuitos para Testes
## ClinicaPlus NLU Agent | Verificado: Abril 2026

Todos os dados abaixo foram verificados contra documentação oficial e fontes primárias.
Nenhuma informação foi inventada.

---

## TIER S — GROQ (Recomendado para desenvolvimento)

**Por quê Groq primeiro:** 700+ tokens/segundo no Llama 3.3 70B. 
Para loops de agente, isto é a diferença entre 2s e 30s de resposta.

### Limites Free Tier (Verificado: console.groq.com, Abril 2026)
| Modelo | RPM | RPD | TPM |
|--------|-----|-----|-----|
| llama-3.3-70b-versatile | 30 | 14.400 | 6.000 |
| llama-3.1-8b-instant | 30 | 14.400 | 20.000 |

**Fonte:** community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790

### Setup LangChain
```bash
pip install langchain-groq
export GROQ_API_KEY="gsk_..."
```

```python
# Qualidade (recomendado para produção/testes reais)
from langchain_groq import ChatGroq
llm_quality = ChatGroq(model="llama-3.3-70b-versatile")

# Velocidade (testes de fluxo, alta frequência)
llm_fast = ChatGroq(model="llama-3.1-8b-instant")
```

### Via init_chat_model (provider-agnostic)
```python
from langchain.chat_models import init_chat_model
llm = init_chat_model("llama-3.3-70b-versatile", model_provider="groq")
```

### Obter API Key
1. Aceder: console.groq.com
2. Sign up com email (sem cartão de crédito)
3. API Keys → Create API Key

### Avaliação para ClinicaPlus
- ✅ Velocidade excepcional (ideal para loops de agente)
- ✅ Sem cartão de crédito
- ✅ 14.400 req/dia (suficiente para dev e testes)
- ✅ Tool calling suportado (necessário para ToolNode)
- ⚠️ 30 RPM pode limitar testes de stress concurrent
- ⚠️ Apenas modelos Meta/Mistral (sem Claude/GPT)

---

## TIER A — CEREBRAS (Alternativa ultra-rápida)

**Destaque único:** 1 milhão de tokens/dia free. Para o agente ClinicaPlus, 
com ~500 tokens por conversa, isso dá ~2.000 conversas completas/dia de graça.

### Limites Free Tier (Verificado: pricepertoken.com/endpoints/cerebras/free, Abril 2026)
| Limite | Valor |
|--------|-------|
| Tokens por dia | 1.000.000 |
| Velocidade | ~20x mais rápido que GPU |
| Cartão de crédito | Não necessário |

**Fonte:** pricepertoken.com/endpoints/cerebras/free

### Modelos disponíveis (Abril 2026)
| Modelo | Notas |
|--------|-------|
| `gpt-oss-120b` | Recomendado — modelo principal actual |
| `llama-3.3-70b` | ⚠️ Scheduled deprecation (verificar antes de usar) |

**ATENÇÃO:** `llama-3.3-70b` e `qwen-3-32b` estão scheduled para deprecation em Fev 2026 no Cerebras. Usar `gpt-oss-120b`.
Fonte: ai-sdk.dev/providers/ai-sdk-providers/cerebras

### Setup LangChain
```bash
pip install langchain-cerebras  # versão 0.7.0 (PyPI, Abril 2026)
export CEREBRAS_API_KEY="csk-..."
```

```python
from langchain_cerebras import ChatCerebras
llm = ChatCerebras(model="gpt-oss-120b")
```

```python
# Via init_chat_model
from langchain.chat_models import init_chat_model
llm = init_chat_model("gpt-oss-120b", model_provider="cerebras")
```

### Obter API Key
1. Aceder: cloud.cerebras.ai
2. Sign up (sem cartão de crédito)
3. API Keys → Generate

### Avaliação para ClinicaPlus
- ✅ 1M tokens/dia — o mais generoso do free tier
- ✅ Ultra-rápido (WSE-3 chip proprietário)
- ✅ LangChain nativo (`langchain-cerebras`)
- ✅ Compatible com ToolNode do LangGraph
- ⚠️ Modelos mais limitados que Groq/Gemini
- ⚠️ Documentação menos madura

---

## TIER A — GOOGLE AI STUDIO / GEMINI (Melhor qualidade free)

**Destaque:** Gemini 2.5 Flash tem contexto de 1 milhão de tokens e é free.
Para o ClinicaPlus, ideal para cenários com histórico longo de conversas.

### Estado actual (Verificado: ai.google.dev/gemini-api/docs/pricing, 1 Abril 2026)
| Modelo | Status |
|--------|--------|
| Gemini 2.5 Flash | ✅ Free tier disponível |
| Gemini 2.5 Pro | ✅ Free tier disponível |
| Gemini 2.0 Flash | ⚠️ **DEPRECATED — Shutdown Junho 2026** |
| Gemini 2.0 Flash-Lite | ⚠️ **DEPRECATED — Shutdown Junho 2026** |

**CRÍTICO:** Não usar Gemini 2.0 em código novo. Shutdown confirmado para Junho 2026.
Fonte: ai.google.dev/gemini-api/docs/pricing (actualizado 1 Abril 2026)

### Limites Free Tier (Verificado: aifreeapi.com, Abril 2026)
| Dimensão | Gemini 2.5 Flash | Gemini 2.5 Pro |
|----------|------------------|----------------|
| RPM | 15 | 5 |
| RPD | 1.500 | 250 |
| TPM | 1.000.000 | 250.000 |

**NOTA IMPORTANTE (Março 2026):** Novos utilizadores agora entram em **prepaid billing**. 
Crédito mínimo de $10 para passar para paid tier. Free tier permanece gratuito mas com limites.
Fonte: blog.laozhang.ai/en/posts/google-gemini-billing-tier-policy-changes

### Setup LangChain
```bash
pip install langchain-google-genai
export GOOGLE_API_KEY="AIza..."
```

```python
from langchain_google_genai import ChatGoogleGenerativeAI
llm = ChatGoogleGenerativeAI(model="gemini-2.5-flash")
```

```python
# Via init_chat_model
from langchain.chat_models import init_chat_model
llm = init_chat_model("gemini-2.5-flash", model_provider="google_genai")
```

### Obter API Key
1. Aceder: aistudio.google.com
2. Sign in com Google Account
3. Get API Key → Create API key in new project

### Avaliação para ClinicaPlus
- ✅ Qualidade superior (melhor reasoning que Llama 70B)
- ✅ 1M context window (histórico longo de paciente)
- ✅ Multimodal (futuro: processar imagens de prescrições)
- ⚠️ RPD de 250 (Pro) é muito baixo para testes intensivos
- ⚠️ Mais lento que Groq/Cerebras
- ⚠️ Mudanças de billing em Março 2026 — verificar sempre

---

## TIER B — OPENROUTER (Acesso a múltiplos modelos)

**Use caso:** Testar vários modelos com uma única API key.

### Modelos Free (`:free` suffix)
```python
# Modelos free confirmados (sujeitos a mudança sem aviso)
models_free = [
    "meta-llama/llama-3.2-3b-instruct:free",
    "mistralai/mistral-7b-instruct:free",
]
```

**AVISO:** Modelos `:free` no OpenRouter podem ficar offline sem aviso.
Sempre ter Groq ou Cerebras como fallback.
Fonte: mrcomputerscience.com/free-llm-api-tier-list-2026-for-broke-developers

### Setup
```bash
pip install langchain-openai  # OpenRouter é compatible com OpenAI SDK
export OPENROUTER_API_KEY="sk-or-..."
```

```python
from langchain_openai import ChatOpenAI
llm = ChatOpenAI(
    model="meta-llama/llama-3.2-3b-instruct:free",
    openai_api_base="https://openrouter.ai/api/v1",
    openai_api_key=os.getenv("OPENROUTER_API_KEY")
)
```

---

## ESTRATÉGIA DE ROTAÇÃO PARA TESTES

```python
# app/agent/testing/provider_rotation.py
"""
Estratégia de rotação para maximizar testes gratuitos.
Baseado em: mrcomputerscience.com/free-llm-api-tier-list-2026
"""

TEST_PROVIDER_STRATEGY = {
    # Testes de fluxo rápido (intent routing, slot extraction)
    "flow_testing": "groq",           # 700 tok/s, ideal para iteração rápida
    
    # Testes de qualidade de resposta
    "quality_testing": "gemini",      # Melhor reasoning, 250 RPD
    
    # Testes de volume / stress
    "volume_testing": "cerebras",     # 1M tokens/dia
    
    # Testes multi-modelo (comparação)
    "comparison_testing": "openrouter",
}
```

---

## REQUIREMENTS.TXT — Versões Verificadas (Abril 2026)

```txt
# Core LangGraph (verificado: github.com/langchain-ai/langgraph/releases)
langgraph==1.1.2
langgraph-checkpoint-postgres==3.0.5
langgraph-checkpoint==4.0.1

# LangChain Core
langchain-core>=0.3.0
langchain>=0.3.0

# LLM Providers (verificados PyPI Abril 2026)
langchain-groq>=0.2.0          # groq.com free tier
langchain-google-genai>=2.0.0  # aistudio.google.com free tier
langchain-cerebras==0.7.0      # cloud.cerebras.ai free tier
langchain-anthropic>=0.3.0     # anthropic.com (pago, melhor qualidade)

# Database
psycopg[binary]>=3.1.0         # OBRIGATÓRIO: psycopg3 (não psycopg2)
asyncpg>=0.29.0

# FastAPI
fastapi>=0.115.0
uvicorn[standard]>=0.30.0

# Utils
pydantic>=2.7.0
python-dotenv>=1.0.0
```

---

## .env.example — Template de Variáveis

```bash
# LLM Providers (registar apenas os que fores usar)
GROQ_API_KEY=gsk_...            # console.groq.com — FREE, sem cartão
GOOGLE_API_KEY=AIza...          # aistudio.google.com — FREE, sem cartão
CEREBRAS_API_KEY=csk-...        # cloud.cerebras.ai — FREE, sem cartão
ANTHROPIC_API_KEY=sk-ant-...    # anthropic.com — PAGO

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/clinicaplus

# FastAPI
SECRET_KEY=your-secret-key-here
DEBUG=true

# Evolution API (WhatsApp)
EVOLUTION_API_URL=https://your-evolution-instance.com
EVOLUTION_API_KEY=your-evolution-api-key

# LangSmith (opcional, para observabilidade)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__...
LANGCHAIN_PROJECT=clinicaplus-nlu
```
