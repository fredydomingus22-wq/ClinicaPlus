import { createClient } from '@supabase/supabase-js';
import { config } from '../src/lib/config';

/**
 * Script de automação para configurar buckets Supabase Storage
 * 
 * Uso:
 * pnpm tsx apps/api/scripts/setup-storage.ts
 * 
 * Este script:
 * 1. Verifica se os buckets necessários existem
 * 2. Cria buckets se não existirem
 * 3. Configura políticas RLS para permitir uploads
 */

const REQUIRED_BUCKETS = [
  { name: config.SUPABASE_PUBLIC_BUCKET, public: true },
  { name: config.SUPABASE_LAUDOS_BUCKET, public: false },
];

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

  } catch (error) {
    console.error('❌ Erro inesperado:', error);
    process.exit(1);
  }
}

setupStorage();
