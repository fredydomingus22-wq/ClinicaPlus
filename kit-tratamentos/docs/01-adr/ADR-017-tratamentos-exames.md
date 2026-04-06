# ADR-017 — Módulo de Tratamentos e Exames Clínicos

**Data:** 2026-04-06
**Status:** ACEITE
**Decisores:** ClinicaPlus Core Team

---

## Contexto

A clínica precisa de registar indicações de exames de forma estruturada e gerir programas de tratamento longos (Fisioterapia, p.ex.). Descobriu-se durante o kick-off que o sistema já tem uma tabela de `Exame` desenhada numa versão inicial, mas está incompleta (usa Strings sem segurança tipada, e desconectada da UI). Ademais, a definição de exames e tratamentos carecia de gestão de Catálogos baseada na clínica para evitar erros de introdução humana.

---

## Decisões

### D1 — Reutilização e Expansão da Entidade \`Exame\` (Sprint I)

Em vez de criar uma tabela `ExameSolicitado` separada (que duplicaria as entidades), decide-se **estender a tabela `Exame` existente**. Serão adicionados campos vitais usando o enum tipado `EstadoExame` e campos analíticos como URL do laudo, sem quebrar logs antigos.

### D2 — Criação de Catálogos Parametrizáveis (Sprint I)

Para prevenir anarquia nos relatórios decorrente de campos de texto livre (`"fisioterapia"`, `"Fisio"`, `"Fisiot."`), introduziremos duas tabelas mestra de catálogo configuráveis por inquilino (`clinicaId`):
- `TipoTratamento`
- `TipoExameClinica`

A criação de Exames e Planos usará o UUID correspondente.

### D3 — Polimorfismo Rejeitado 

Manter a entidade `PlanoTratamento` separada da `Consulta` devido a divergências analíticas (total sessões, duração baseada num pacote e worker assíncrono BullMQ para explodir agendamentos ligados às `SessaoTratamento`). 

### D4 — Laudos Offline-First

O laudo em PDF segue o design de `signed-URL`. O front-end envia diretamente ao *Supabase Storage* poupando largura de banda do Backend Express, enviando o confirm para gravar em DB local em sequência.

---

## Consequências

**Ganhos:**
- Dados históricos estruturados por catálogos fixos configurados pelo utilizador administrador da Clínica. 
- Sem duplicação de dados e reaproveitamento do código Prisma existente.

**Custos:**
- Migração delta da tabela `Exame` obriga as UIs atuais (caso alguma em beta a utilize) a respeitar os links com categorias.
