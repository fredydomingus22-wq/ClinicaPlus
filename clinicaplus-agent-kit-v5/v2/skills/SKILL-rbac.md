# SKILL: RBAC Granular

Lê antes de permissões, permissaoService, ou UI de gestão de permissões.
Referência: `docs/11-modules/MODULE-rbac.md`

---

## Verificação de Permissão

```typescript
// Em services sensíveis:
await permissaoService.requirePermission(req.user.id, 'fatura', 'void');
// → AppError 403 se não autorizado

// Em lógica condicional:
const podeExportar = await permissaoService.check(req.user.id, 'relatorio', 'export');
if (!podeExportar) { ... }
```

## Cache

```
Chave Redis: perm:{userId}:{recurso}:{accao}    ex: perm:cm123:fatura:void
TTL: 300 segundos
Invalidar: permissaoService.invalidateCache(userId) ao alterar permissão
```

## Audit Log

```typescript
// Obrigatório em mutações financeiras e acções sensíveis:
await auditLogService.log({
  clinicaId,
  actorId:   req.user.id,
  actorTipo: 'UTILIZADOR',
  accao:     'UPDATE',
  recurso:   'fatura',
  recursoId: fatura.id,
  antes:     faturaAnterior,    // snapshot antes da mutação
  depois:    faturaAtualizada,  // snapshot depois
  ip:        req.ip,
});
```

## Checklist

- [ ] `requirePermission()` em: fatura:void, paciente:delete, relatorio:export, apikey:manage
- [ ] Cache invalidado após PUT /utilizadores/:id/permissoes/:codigo
- [ ] Seed de RolePermissao é idempotente (upsert)
- [ ] `GET /audit-logs` acessível apenas a ADMIN e SUPER_ADMIN
- [ ] Retenção: jobs mensais de arquivamento de audit logs > 2 anos
