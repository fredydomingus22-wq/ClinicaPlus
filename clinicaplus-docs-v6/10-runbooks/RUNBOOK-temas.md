# RUNBOOK — Temas, White-label e Domínios

## Tabela de diagnóstico rápido

| Sintoma | Causa | Secção |
|---------|-------|--------|
| Logo não aparece após upload | URL inválida ou bucket Supabase inacessível | §1 |
| Tema não carrega para subdomínio | DNS não propagado ou endpoint /public/tema com erro | §2 |
| Subdomínio devolveu 404 | Wildcard DNS não configurado no Vercel | §3 |
| Domínio custom não resolve | CNAME não propagado ou Vercel não configurado | §4 |
| Cores antigas após mudar tema | Cache do browser ou cache do TemaProvider | §5 |

---

## §1 — Logo não aparece

```bash
# Testar se URL da logo está acessível
curl -I "$(psql $DATABASE_URL -t -c "SELECT logo_url FROM configuracoes_clinica WHERE clinica_id='<id>'")"
```

**Se URL retorna 403/404 — problema no Supabase Storage:**
```bash
# Verificar políticas do bucket via Supabase Dashboard:
# Storage → logos → Policies → Verificar que "Public read" está activo
```

**Reupload manual:**
```bash
curl -X POST $API_URL/api/clinicas/me/logo \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -F "logo=@/path/to/logo.png"
```

---

## §2 — Tema não carrega para subdomínio

```bash
# Testar endpoint directamente
curl -s "$API_URL/api/public/tema?domain=nutrimacho.clinicaplus.ao" | jq .

# Verificar se subdomínio está registado na DB
psql $DATABASE_URL -c "
  SELECT cc.subdominio, cc.tema_id, cc.logo_url, c.nome
  FROM configuracoes_clinica cc
  JOIN clinicas c ON c.id = cc.clinica_id
  WHERE cc.subdominio = 'nutrimacho'
"
```

---

## §3 — Subdomínio com 404 no Vercel

O wildcard `*.clinicaplus.ao` precisa de estar configurado no Vercel:

```bash
# Via Vercel CLI
vercel domains add "*.clinicaplus.ao" --project clinicaplus-web

# Verificar se está activo
vercel domains ls
```

---

## §4 — Domínio custom não resolve

```bash
# Verificar CNAME do cliente
dig CNAME sistema.nutrimacho.ao

# Deve retornar: app.clinicaplus.ao

# Adicionar domínio ao Vercel
curl -X POST "https://api.vercel.com/v10/projects/$VERCEL_PROJECT_ID/domains" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "name": "sistema.nutrimacho.ao" }'
```

Propagação DNS pode demorar até 48h. O estado de verificação aparece no painel da clínica.

---

## §5 — Cores antigas após mudar tema

**Browser cache:** instruir o admin a fazer hard refresh (Ctrl+Shift+R).

**Cache do TemaProvider:** o `TemaProvider` faz fetch a cada carregamento de página — sem cache persistente. Se o problema persiste, verificar se o endpoint `/api/public/tema` retorna as cores novas:

```bash
curl -s "$API_URL/api/public/tema?domain=<slug>.clinicaplus.ao" | jq .data.cores
```

Se o endpoint retorna cores antigas, verificar se a mutation de actualização de tema fez invalidate à query:
```typescript
// Após PATCH /api/clinicas/me/tema deve haver:
queryClient.invalidateQueries({ queryKey: ['clinica-config'] });
// E recarregar o tema no store:
temaStore.setTema({ ... });
```
