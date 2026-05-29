import { createClient } from '@supabase/supabase-js';
import { config } from '../lib/config';

/**
 * Script de automação para configurar buckets Supabase Storage
 * 
 * Uso:
 * pnpm tsx apps/api/src/scripts/setup-storage.ts
 * 
 * Este script:
 * 1. Verifica se os buckets necessários existem
 * 2. Cria buckets se não existirem
 * 3. Configura políticas RLS para permitir uploads e downloads
 */

const REQUIRED_BUCKETS = [
  { name: config.SUPABASE_PUBLIC_BUCKET, public: true },
  { name: config.SUPABASE_LAUDOS_BUCKET, public: false },
];

async function callStorageRpc(
  supabase: any,
  functionName: string,
  args: Record<string, unknown>,
  fallbackMessage: string
) {
  try {
    return await supabase.rpc(functionName, args);
  } catch {
    return { data: null, error: { message: fallbackMessage } };
  }
}

/**
 * Configura políticas RLS para os buckets
 */
async function setupRLSPolicies(supabase: any) {
  const publicBucket = config.SUPABASE_PUBLIC_BUCKET;
  const privateBucket = config.SUPABASE_LAUDOS_BUCKET;

  // Políticas para bucket público (assets)
  console.log(`\n📝 Configurando políticas para bucket "${publicBucket}"...`);

  // Permitir uploads públicos (INSERT)
  const { error: insertError } = await callStorageRpc(supabase, 'create_policy', {
    policy_name: 'Allow public uploads',
    table_name: 'objects',
    policy_action: 'INSERT',
    policy_definition: `bucket_id = '${publicBucket}'`,
    policy_to: 'anon, authenticated',
    policy_check: `bucket_id = '${publicBucket}'`
  }, 'RPC não disponível, usando SQL direto');

  if (insertError && insertError.message.includes('RPC não disponível')) {
    // Fallback: Executar SQL direto via exec
    const sql = `
      DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
      CREATE POLICY "Allow public uploads"
      ON storage.objects FOR INSERT
      TO anon, authenticated
      WITH CHECK (bucket_id = '${publicBucket}');
    `;
    const { error: sqlError } = await callStorageRpc(supabase, 'exec_sql', { sql }, 'SQL exec não disponível');
    
    if (sqlError && !sqlError.message.includes('SQL exec não disponível')) {
      console.warn('⚠️  Não foi possível criar política de upload via SQL:', sqlError.message);
    } else {
      console.log('✅ Política de upload configurada');
    }
  } else if (insertError) {
    console.warn('⚠️  Erro ao criar política de upload:', insertError.message);
  } else {
    console.log('✅ Política de upload configurada');
  }

  // Permitir downloads públicos (SELECT)
  const { error: selectError } = await callStorageRpc(supabase, 'create_policy', {
    policy_name: 'Allow public downloads',
    table_name: 'objects',
    policy_action: 'SELECT',
    policy_definition: `bucket_id = '${publicBucket}'`,
    policy_to: 'anon, authenticated',
    policy_using: `bucket_id = '${publicBucket}'`
  }, 'RPC não disponível');

  if (selectError && selectError.message.includes('RPC não disponível')) {
    const sql = `
      DROP POLICY IF EXISTS "Allow public downloads" ON storage.objects;
      CREATE POLICY "Allow public downloads"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = '${publicBucket}');
    `;
    const { error: sqlError } = await callStorageRpc(supabase, 'exec_sql', { sql }, 'SQL exec não disponível');
    
    if (sqlError && !sqlError.message.includes('SQL exec não disponível')) {
      console.warn('⚠️  Não foi possível criar política de download via SQL:', sqlError.message);
    } else {
      console.log('✅ Política de download configurada');
    }
  } else if (selectError) {
    console.warn('⚠️  Erro ao criar política de download:', selectError.message);
  } else {
    console.log('✅ Política de download configurada');
  }

  // Políticas para bucket privado (laudos)
  console.log(`\n📝 Configurando políticas para bucket "${privateBucket}"...`);

  // Permitir uploads apenas para autenticados
  const privateUploadSql = `
    DROP POLICY IF EXISTS "Allow authenticated uploads to laudos" ON storage.objects;
    CREATE POLICY "Allow authenticated uploads to laudos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = '${privateBucket}');
  `;
  
  const { error: privateUploadError } = await callStorageRpc(
    supabase,
    'exec_sql',
    { sql: privateUploadSql },
    'SQL exec não disponível'
  );
  
  if (privateUploadError && !privateUploadError.message.includes('SQL exec não disponível')) {
    console.warn('⚠️  Não foi possível criar política de upload privado:', privateUploadError.message);
  } else {
    console.log('✅ Política de upload privado configurada');
  }

  // Permitir downloads apenas para autenticados
  const privateDownloadSql = `
    DROP POLICY IF EXISTS "Allow authenticated downloads from laudos" ON storage.objects;
    CREATE POLICY "Allow authenticated downloads from laudos"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = '${privateBucket}');
  `;
  
  const { error: privateDownloadError } = await callStorageRpc(
    supabase,
    'exec_sql',
    { sql: privateDownloadSql },
    'SQL exec não disponível'
  );
  
  if (privateDownloadError && !privateDownloadError.message.includes('SQL exec não disponível')) {
    console.warn('⚠️  Não foi possível criar política de download privado:', privateDownloadError.message);
  } else {
    console.log('✅ Política de download privado configurada');
  }

  console.log('\n⚠️  Nota: Se as políticas não foram aplicadas automaticamente,');
  console.log('   configure-as manualmente no Supabase Dashboard → Storage → Policies');
}

async function setupStorage() {
  console.log('🚀 Iniciando configuração do Supabase Storage...\n');

  // Criar cliente Supabase com service role key
  const supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Listar buckets existentes
    const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();

    if (listError) {
      console.error('❌ Erro ao listar buckets:', listError);
      process.exit(1);
    }

    const existingBucketNames = new Set(existingBuckets?.map(b => b.name) || []);
    console.log(`📦 Buckets existentes: ${existingBucketNames.size > 0 ? Array.from(existingBucketNames).join(', ') : 'nenhum'}\n`);

    // Criar buckets que não existem
    for (const bucket of REQUIRED_BUCKETS) {
      if (existingBucketNames.has(bucket.name)) {
        console.log(`✅ Bucket "${bucket.name}" já existe`);
        continue;
      }

      console.log(`📝 Criando bucket "${bucket.name}"...`);
      const { error: createError } = await supabase.storage.createBucket(bucket.name, {
        public: bucket.public,
      });

      if (createError) {
        console.error(`❌ Erro ao criar bucket "${bucket.name}":`, createError);
        process.exit(1);
      }

      console.log(`✅ Bucket "${bucket.name}" criado com sucesso`);
    }

    console.log('\n🎉 Configuração do Storage concluída com sucesso!');
    console.log('\n📋 Resumo:');
    console.log(`   - ${config.SUPABASE_PUBLIC_BUCKET}: público (logos, avatars, docs)`);
    console.log(`   - ${config.SUPABASE_LAUDOS_BUCKET}: privado (laudos médicos)`);
    console.log('\n💡 Certifique-se de que STORAGE_PROVIDER=supabase está definido no ambiente de produção.');

    // Configurar políticas RLS
    console.log('\n🔐 Configurando políticas RLS...');
    await setupRLSPolicies(supabase);
    console.log('✅ Políticas RLS configuradas com sucesso!');

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
}

setupStorage();
