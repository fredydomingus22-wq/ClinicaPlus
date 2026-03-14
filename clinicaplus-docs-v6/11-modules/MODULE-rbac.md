# Módulo RBAC Granular — Especificação

---

## 1. Lista Completa de Permissões

```
Módulo: pacientes
  paciente:read, paciente:create, paciente:update, paciente:delete

Módulo: agendamentos
  agendamento:read, agendamento:create, agendamento:update, agendamento:cancel

Módulo: financeiro
  fatura:read, fatura:create, fatura:void
  pagamento:create
  relatorio:read, relatorio:export

Módulo: medicos
  medico:read, medico:create, medico:update, medico:deactivate

Módulo: configuracao
  configuracao:read, configuracao:update

Módulo: utilizadores
  utilizador:read, utilizador:invite, utilizador:deactivate
  utilizador:permissions

Módulo: plataforma
  apikey:manage, webhook:manage, auditlog:read
```

---

## 2. Seed de Permissões Base (Migration 003)

O seed popula `RolePermissao` e deve ser idempotente (upsert).
Matriz completa: ver `06-security/SECURITY_v2.md` secção 3.

```typescript
// prisma/seeds/permissoes.ts
const permissoes = [
  { codigo: 'fatura:void',    descricao: 'Anular faturas', modulo: 'financeiro' },
  { codigo: 'fatura:create',  descricao: 'Criar faturas', modulo: 'financeiro' },
  // ... todas as permissões
];

for (const p of permissoes) {
  await prisma.permissao.upsert({ where: { codigo: p.codigo }, create: p, update: {} });
}

// RolePermissao — popula a matriz base
const rolePerms: { papel: Papel; codigo: string }[] = [
  { papel: 'RECEPCIONISTA', codigo: 'fatura:create' },
  { papel: 'RECEPCIONISTA', codigo: 'fatura:read' },
  { papel: 'ADMIN',         codigo: 'fatura:void' },
  // ... etc (ver matriz em SECURITY_v2.md)
];

for (const rp of rolePerms) {
  const permissao = await prisma.permissao.findUniqueOrThrow({ where: { codigo: rp.codigo } });
  await prisma.rolePermissao.upsert({
    where: { papel_permissaoId: { papel: rp.papel, permissaoId: permissao.id } },
    create: { papel: rp.papel, permissaoId: permissao.id },
    update: {},
  });
}
```

---

## 3. UI de Gestão de Permissões

```
Admin → Utilizadores → [utilizador] → "Gerir Permissões"

Modal organizado por módulo (tabs ou accordion):
  Pacientes | Agendamentos | Financeiro | Configuração | Plataforma

Por permissão:
  [toggle] Descrição da permissão
  Chip "role base" → valor por defeito da role (não editável, apenas informativo)
  Chip "override" → aparece quando utilizador tem override activo (GRANT ou DENY)

Footer:
  [Repor para Padrão do Role] → DELETE todos os UtilizadorPermissao deste utilizador
  [Guardar alterações]        → PUT /utilizadores/:id/permissoes/:codigo por override
                                + invalidar cache Redis do utilizador
```

---

## 4. Audit Log — Retenção

```
Activo no DB: 2 anos
Após 2 anos: arquivar para Supabase Storage (bucket privado) em formato NDJSON
Job mensal no worker:
  SELECT WHERE criadoEm < NOW() - INTERVAL '2 years'
  → upload para storage → DELETE do DB

Acesso aos arquivados: apenas SUPER_ADMIN, via download directo do bucket
```
