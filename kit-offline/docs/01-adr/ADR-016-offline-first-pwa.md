# ADR-016 — Offline-First e Performance Instantânea

**Data:** 2026-03-29
**Status:** ACEITE
**Decisores:** ClinicaPlus Core Team

---

## Contexto

Angola tem velocidade média de download móvel de 12.7 Mbps — menos de metade da mediana global. Utilizadores passam entre 8% e 38% do tempo em redes 3G/2G. Numa clínica em Luanda, a recepcionista pode perder sinal a meio do dia sem aviso.

O ClinicaPlus como SPA carregada da rede a cada sessão é inaceitável para este contexto. O carregamento inicial é de 2-5 segundos em 3G. Uma quebra de sinal a meio de uma marcação perde o trabalho feito.

---

## Problema de domínio — conflito de slots

A decisão mais importante não é tecnológica, é de produto. Um slot de consulta tem uma janela temporal única. Duas recepcionistas que trabalham offline em simultâneo podem tentar marcar o mesmo slot. Não existe resolução automática segura para conflitos de slot em saúde.

**Decisão tomada:** escrever agendamentos exige conectividade. Ler dados funciona offline.

Esta distinção permite 95% do valor do offline-first (consultar, verificar, preparar o dia) sem os riscos dos conflitos de escrita em dados críticos.

---

## Decisões

### D1 — App shell via Service Worker (Sprint A)

`vite-plugin-pwa@1.x` com `registerType: 'autoUpdate'` e Workbox 7.3. Após primeira visita, HTML/CSS/JS são servidos do cache local. Carregamento < 100ms mesmo offline.

**Estratégia de cache por tipo:**
- Assets estáticos (JS, CSS, fontes, imagens): `CacheFirst` — nunca mudam após build
- Dados da API (reads): `StaleWhileRevalidate` — serve do cache, actualiza em background
- Chamadas de auth, writes: `NetworkOnly` — nunca cacheadas

### D2 — Persistência de dados via TanStack Query + IndexedDB (Sprint B)

`@tanstack/react-query-persist-client` + `idb-keyval` para persistir o cache do TanStack Query no IndexedDB entre sessões. `gcTime: 24h` para os dados do dia ficarem disponíveis sem rede.

**Não usar** o Service Worker para interceptar chamadas da API — causa conflito com o sistema de invalidação do TanStack Query. O SW trata apenas assets estáticos.

### D3 — Optimistic updates + mutation queue selectiva (Sprint C)

| Operação | Estratégia offline | Razão |
|----------|-------------------|-------|
| Criar agendamento | ❌ Bloquear sem rede | Conflito de slot inaceitável |
| Cancelar agendamento | ✅ Optimistic + queue | Sem conflito — único paciente/slot |
| Confirmar agendamento | ✅ Optimistic + queue | Sem conflito |
| Actualizar estado | ✅ Optimistic + queue | Sem conflito |
| Ver agendamentos | ✅ IndexedDB cache | Read-only |
| Ver pacientes | ✅ IndexedDB cache | Read-only |

### D4 — Vite 8 + Rolldown

O projecto usa Vite 5 actualmente. A migração para Vite 8 (com Rolldown — bundler Rust unificado) dá 10-30x builds mais rápidos. A migração é ortogonal ao offline-first mas recomendada no mesmo sprint por ser um upgrade de infra.

---

## Consequências

**Ganhos:**
- Carregamento < 100ms após primeira visita (de 2-5s actuais)
- App funcional sem rede para todas as operações de leitura
- Instalável no telemóvel (PWA — Add to Home Screen)
- Dados do dia disponíveis offline (agendamentos, pacientes, receitas)
- Builds 10-30x mais rápidos em CI/CD

**Custos:**
- Gestão de actualizações de SW (precaução com versões stale)
- IndexedDB tem limite de ~50-100MB por domínio — suficiente para o caso de uso
- Recepcionistas precisam de ser informadas que criar agendamentos requer ligação
- Migração para Vite 8 pode requerer actualização de plugins
