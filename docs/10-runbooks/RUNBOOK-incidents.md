# Runbook de Incidentes — ClinicaPlus

Guia de referência para diagnóstico e resolução de problemas comuns em produção.

## 1. API não responde (Railway container down)
**Sintomas:** `/health` retorna timeout ou erro 502/503.
**Diagnóstico:** Railway dashboard → Deployments → ver logs de crash.
**Acção imediata:** Railway → Redeploy do último deploy estável.
**Causa comum:** Variável de ambiente em falta (`config.ts` crash), Out of Memory (OOM), ou erro em migrações pendentes.
**Verificação:** `bash scripts/health-check.sh prod`

## 2. Login a falhar em produção (JWT issues)
**Sintomas:** Erro 401 em todos os logins, mesmo com credenciais correctas.
**Diagnóstico:** Ver logs Railway → procurar por "invalid signature" ou "jwt malformed".
**Causa:** `JWT_SECRET` diferente entre deploys ou alterado acidentalmente.
**Acção:** Verificar `JWT_SECRET` no Railway Variables; este valor deve ser persistente.
**Nota:** Mudar o `JWT_SECRET` invalida todas as sessões activas; os utilizadores terão de fazer login novamente.

## 3. Migration falhou (deploy bloqueado)
**Sintomas:** O serviço Railway crasha logo ao iniciar; os logs mostram "migration failed".
**Diagnóstico:** Verificar se `DIRECT_URL` está configurado corretamente (porta 5432).
**Acção:** `bash scripts/rollback.sh` → opção 3, e depois fazer deploy da versão anterior.
**Prevenção:** Testar sempre novas migrações em ambiente de staging antes de avançar para produção.

## 4. Base de dados lenta (timeouts)
**Sintomas:** `/health` retorna `status: "degraded"`; queries a demorar mais de 1 segundo.
**Diagnóstico:** Supabase dashboard → Database → Query Performance.
**Acção imediata:** Verificar se existem queries pesadas sem índices em execução.
**Acção correctiva:** Adicionar índices às tabelas afectadas ou fazer upgrade do plano Supabase se necessário.

## 5. Leak de dados (Cross-tenant leak) suspeito
**Sintomas:** Um utilizador reporta ver dados de uma clínica que não a sua.
**Acção imediata:** Desactivar temporariamente a conta do utilizador afectado ou colocar o sistema em manutenção.
**Diagnóstico:** Analisar logs de audit para identificar queries que possam ter ignorado o filtro `clinicaId`.
**Acção correctiva:** Corrigir o bug de segurança, efectuar deploy e verificar a integridade dos dados.
**Obrigação:** Notificar as clínicas afectadas conforme as normas do RGPD e protecção de dados.

## 6. Utilização anormal (Possível Ataque)
**Sintomas:** Rate limiter a disparar frequentemente; picos de tráfego de IPs desconhecidos.
**Diagnóstico:** Logs do Railway → filtrar por erros 429 (Too Many Requests).
**Acção:** Bloquear IPs suspeitos no painel do Railway ou através da Cloudflare.
**Verificação:** `bash scripts/health-check.sh prod`
