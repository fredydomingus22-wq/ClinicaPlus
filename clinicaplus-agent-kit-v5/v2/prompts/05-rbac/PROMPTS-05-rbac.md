# Sprint 6 — RBAC Granular + Audit Log

**Skill:** `SKILL-rbac.md` + `docs/11-modules/MODULE-rbac.md`

---

## Prompt 6.1 — Schema RBAC + Seed + permissaoService

```
Lê SKILL-rbac.md na íntegra.
Lê docs/DATABASE_SCHEMA_v2.md (migration_003 — RBAC).
Lê docs/11-modules/MODULE-rbac.md (secções 1, 2).

1. Adiciona ao schema.prisma: Permissao, RolePermissao, UtilizadorPermissao
   pnpm db:migrate → nome: "add_rbac_granular"

2. Cria prisma/seeds/permissoes.ts (idempotente — upsert):
   - Criar todas as permissões listadas em MODULE-rbac.md secção 1
   - Popular RolePermissao com a matriz de SECURITY_v2.md secção 3
   - Executar: pnpm --filter=api exec ts-node prisma/seeds/permissoes.ts

3. Cria apps/api/src/services/permissao.service.ts (ver BACKEND_v2.md secção 7):
   check(userId, recurso, accao): cache Redis + DB fallback
   requirePermission(userId, recurso, accao): lança AppError 403 se não autorizado
   invalidateCache(userId): apaga perm:{userId}:* do Redis

4. Escreve testes unitários para permissao.service:
   - Role sem permissão, sem override → false
   - Role com permissão → true
   - GRANT override em role sem permissão → true
   - DENY override em role com permissão → false
   - Cache hit → não chama DB (mock redis retorna '1')
   - invalidateCache → redis.del() chamado com padrão correcto

5. Cria apps/api/src/routes/audit-logs.ts:
   GET /audit-logs com filtros e paginação (ver API_REFERENCE_v2.md)
   requireRole(['ADMIN', 'SUPER_ADMIN'])

6. Corre: pnpm test --run --filter=api

Reporta resultados. Todos os novos testes devem passar.
```

---

## Prompt 6.2 — Integrar RBAC + UI de Permissões

```
Lê SKILL-rbac.md.

1. Adiciona requirePermission() nos services:
   faturasService.anular()             → requirePermission(userId, 'fatura', 'void')
   faturasService.exportRelatorio()    → requirePermission(userId, 'relatorio', 'export')
   pacientesService.delete()           → requirePermission(userId, 'paciente', 'delete')
   apikeysService.create()             → requirePermission(userId, 'apikey', 'manage')
   webhooksService.create()            → requirePermission(userId, 'webhook', 'manage')

2. Adiciona endpoint de gestão de permissões:
   GET  /utilizadores/:id/permissoes (ver API_REFERENCE_v2.md)
   PUT  /utilizadores/:id/permissoes/:codigo → { tipo: GRANT|DENY|RESET }
   Após PUT: permissaoService.invalidateCache(utilizadorId)

3. Completa auditLog.service.ts:
   - Adicionar campos antes e depois (snapshot JSON)
   - getList(filters): com paginação e filtros (actorId, recurso, accao, período)
   - Log em faturasService: incluir antes/depois nas mutações

4. Cria pages/admin/AuditLogPage.tsx:
   - Tabela paginada: actor | acção | recurso | timestamp
   - Expandir linha → ver JSON antes/depois
   - Filtros: período, actor, acção, recurso

5. Adiciona PermissoesModal à UtilizadoresPage:
   - Toggle por permissão com estado efectivo (base + override)
   - Chip "override" quando diferente da base
   - Botão "Repor para Padrão do Role"

Checkpoint Sprint 6:
   - [ ] Recepcionista não consegue anular fatura → 403
   - [ ] Admin concede fatura:void à recepcionista sénior
   - [ ] Após grant: recepcionista sénior consegue anular
   - [ ] AuditLog regista com antes/depois correcto
   - [ ] Cache invalidado após alterar permissão (testar: mudar, chamar endpoint, ver resposta correcta)
   - [ ] pnpm test --run zero falhas
```

---

