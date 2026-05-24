# Scripts de Automação

## Setup do Supabase Storage

### O que faz
O script `setup-storage.ts` automatiza a configuração dos buckets necessários no Supabase Storage:
- **assets** (público): logos, avatars, documentos de contratos
- **laudos** (privado): laudos médicos

### Pré-requisitos
- Env vars configuradas:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_PUBLIC_BUCKET` (default: `assets`)
  - `SUPABASE_LAUDOS_BUCKET` (default: `laudos`)

### Como usar

```bash
# Executar o script
pnpm --filter api storage:setup

# Ou diretamente
cd apps/api
pnpm storage:setup
```

### O que o script faz
1. Lista buckets existentes no Supabase Storage
2. Cria buckets que não existem
3. Configura buckets como públicos/privados conforme necessário
4. Exibe resumo da configuração

### Após executar
Certifique-se de que `STORAGE_PROVIDER=supabase` está definido no ambiente de produção para que o upload funcione corretamente.

### Troubleshooting
- **Erro de permissão**: Verifique se `SUPABASE_SERVICE_ROLE_KEY` está correto e tem permissões de admin
- **Bucket já existe**: O script ignora buckets que já existem
- **Erro de conexão**: Verifique `SUPABASE_URL` e conectividade com Supabase
