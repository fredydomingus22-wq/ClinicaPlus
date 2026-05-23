# Recuperar migração falhada `20260521234500_fix_tipo_documento_fiscal_remove_vd`

## Sintoma

```
Error: P3009
The `20260521234500_fix_tipo_documento_fiscal_remove_vd` migration ... failed
```

## Causa

A migração original usava `BEGIN/COMMIT` interno e fazia `UPDATE` de linhas `VD` para `FT` sem garantir a unicidade em `sequencia_doc_fiscal`, gerando conflito na constraint `(clinicaId, tipoDoc, serie, anoFiscal)`.

## Passos (produção Supabase)

1. Use a **connection string directa** (porta 5432), não o pooler em modo transaction, para `migrate`.

2. Marque a migração falhada como revertida (código corrigido já está no repositório):

```bash
cd apps/api
pnpm exec prisma migrate resolve --rolled-back 20260521234500_fix_tipo_documento_fiscal_remove_vd
```

3. Volte a aplicar:

```bash
pnpm exec prisma migrate deploy
```

4. Se `deploy` ainda falhar, inspecione tipos órfãos:

```sql
SELECT typname FROM pg_type WHERE typname LIKE 'TipoDocumentoFiscal%';
```

5. Redeploy da API/worker no Railway.

## Nota

A remoção de `VD` pode já ter sido feita pela migração `20260520091023_fix_pagamentos_numero_recibo`. A versão corrigida de `20260521234500` é **idempotente** e ignora o bloco de enum se `VD` já não existir.
