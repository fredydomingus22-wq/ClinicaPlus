# ADR-002 — Estratégia Multi-Provider LLM (Provider-Agnostic)
## Architecture Decision Record | ClinicaPlus v2

**Status:** Aceite  
**Data:** Abril 2026  
**Decisores:** Domingos Cambongo (Lead Architect)  
**Módulo:** NLU Pipeline — Camada de Inferência LLM

---

## Contexto

O ClinicaPlus serve múltiplas clínicas (tenants), cada uma com necessidades e orçamentos diferentes. Algumas clínicas podem querer o modelo mais económico (Groq Llama 8B), outras o mais preciso (Claude Sonnet), e outras podem mudar de provider conforme os preços evoluam.

Adicionalmente, durante o desenvolvimento, é necessário minimizar custos usando providers com free tiers generosos.

---

## Decisão

Implementar uma **camada de abstracção de LLM via `init_chat_model` do LangChain**, configurável por tenant na tabela `clinics` do PostgreSQL. O grafo LangGraph é completamente agnóstico ao provider — apenas recebe um objecto `BaseChatModel`.

### Provider Map (Verificado Abril 2026)

| Provider Key | Modelo | Custo | Uso Recomendado |
|---|---|---|---|
| `groq` | llama-3.3-70b-versatile | Free (14.400 req/dia) | Dev/testes, produção básica |
| `groq_fast` | llama-3.1-8b-instant | Free (14.400 req/dia) | Alto volume, respostas simples |
| `cerebras` | gpt-oss-120b | Free (1M tok/dia) | Volume de testes, stress testing |
| `gemini` | gemini-2.5-flash | Free (1.500 RPD) | Produção qualidade média |
| `claude` | claude-sonnet-4-6 | Pago (~$3/M tok in) | Produção qualidade máxima |

---

## Alternativas Consideradas

### Opção A: Provider fixo (Claude apenas)
**Contras:** Custo elevado para clínicas pequenas; sem fallback; lock-in de vendor

### Opção B: Provider por ambiente (Groq dev, Claude prod)
**Contras:** Comportamento diferente em dev vs prod; bugs impossíveis de reproduzir

### Opção C: Provider-agnostic por tenant (escolhida)
**Prós:** Flexibilidade máxima; testes com modelos gratuitos; produção com melhor modelo; sem lock-in

---

## Regra de Fallback

```
Se GROQ_API_KEY não disponível → tentar CEREBRAS_API_KEY
Se CEREBRAS_API_KEY não disponível → tentar GOOGLE_API_KEY  
Se nenhum disponível → erro explícito (não silencioso)
```

---

## Alertas de Mudança (Verificados Abril 2026)

- **Gemini 2.0 Flash:** DEPRECATED, shutdown Junho 2026. Nunca usar em código novo.
- **Cerebras llama-3.3-70b:** Deprecation agendada. Usar `gpt-oss-120b`.
- **Groq rate limits:** Sujeitos a mudança trimestral. Verificar em console.groq.com

---

## Consequências

- Cada tenant pode ter o seu LLM configurado na DB
- Upgrade de modelo sem deploy de código
- Testes 100% gratuitos com Groq + Cerebras
- Comportamento consistente entre ambientes (mesmo código, provider diferente)

---

## Fontes de Referência

- python.langchain.com/docs/how_to/chat_models_universal_init
- community.groq.com/t/is-there-a-free-tier-and-what-are-its-limits/790
- pricepertoken.com/endpoints/cerebras/free
- ai.google.dev/gemini-api/docs/pricing (actualizado 1 Abril 2026)
- inference-docs.cerebras.ai/integrations/langchain
