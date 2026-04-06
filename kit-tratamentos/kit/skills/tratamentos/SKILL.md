---
name: tratamentos
description: >
  Usa esta skill SEMPRE que tocares em: schema Prisma de Exame (extensão),
  TipoTratamento, TipoExameClinica, PlanoTratamento, SessaoTratamento — serviços exames.service, planos.service.
references:
  - reference/state-machines.md
  - reference/api-patterns.md
  - reference/ui-patterns.md
---

## Quando usar esta skill
- Estender ou modificar o model existente de Exames, Planos, ou Tipos de catálogo
- Implementar transições tipadas.
- Criar/configurar catálogo Base de configurações do Utilizador
- ...


## Regras absolutas

### 1. clinicaId SEMPRE presente em TODAS as queries, e uso de Catálogos Base
Qualquer input livre na criação de `Exame` ou `PlanoTratamento` constitui um bad practice. O utilizador e os componentes Frontend (<select>) **devem** ser gerados via queries das configurações `TipoExameClinica` ou `TipoTratamento`. 

### (Restantes regras de máquina de estados BullMQ Idempotentes, Map de DTOS, e Upload via signedUrl mantem-se ativas)

```typescript
// CORRECTO - Extensão correta da Máquina em Update
await auditLogService.log({
  clinicaId,
  entidade: 'Exame', // Nome retificado da model principal
  entidadeId: exameId,
  accao: 'ACTUALIZAR_ESTADO'
})
```
