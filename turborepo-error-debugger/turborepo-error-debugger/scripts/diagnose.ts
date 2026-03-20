#!/usr/bin/env npx tsx
/**
 * diagnose.ts
 *
 * Diagnóstico interativo de erros no monorepo.
 * Cole um erro, stack trace ou descrição — o script classifica,
 * sugere fixes e pode aplicá-los automaticamente.
 *
 * Uso:
 *   npx tsx scripts/diagnose.ts
 *   npx tsx scripts/diagnose.ts --error "Cannot read properties of undefined"
 *   npx tsx scripts/diagnose.ts --file error.log
 *   npx tsx scripts/diagnose.ts --fix   (aplica fixes automaticamente quando possível)
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'

const args = process.argv.slice(2)
const AUTO_FIX = args.includes('--fix')
const ERROR_FLAG = args[args.indexOf('--error') + 1] ?? null
const FILE_FLAG  = args[args.indexOf('--file') + 1]  ?? null

// ── Tipos ─────────────────────────────────────────────────────────────────────
type ErrorCategory =
  | 'HTTP_400'
  | 'RUNTIME_JS'
  | 'BUILD_VITE'
  | 'TURBO_PIPELINE'
  | 'CROSS_PACKAGE'
  | 'UNKNOWN'

interface DiagnosisResult {
  category: ErrorCategory
  confidence: 'high' | 'medium' | 'low'
  summary: string
  causes: Cause[]
}

interface Cause {
  probability: 'alta' | 'média' | 'baixa'
  description: string
  fix?: string
  autoFixable?: boolean
  autoFixFn?: () => Promise<void>
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const ask = (q: string): Promise<string> =>
  new Promise(resolve => rl.question(`\n  ? ${q} `, ans => resolve(ans.trim())))

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(60))
}

function detectMonorepoRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'turbo.json'))) return dir
    dir = path.dirname(dir)
  }
  return process.cwd() // fallback
}

// ── Classificador ─────────────────────────────────────────────────────────────
function classify(input: string): DiagnosisResult {
  const lower = input.toLowerCase()

  // HTTP 400
  if (/400|bad request|validation error|zod|schema|invalid.*body|payload/i.test(input)) {
    return {
      category: 'HTTP_400',
      confidence: 'high',
      summary: 'Erro de requisição HTTP 400 — o servidor rejeitou o payload.',
      causes: diagnose400(input),
    }
  }

  // Cross-package / import
  if (/failed to resolve|could not resolve|cannot find module|module not found/i.test(input) &&
      /@repo|packages\//i.test(input)) {
    return {
      category: 'CROSS_PACKAGE',
      confidence: 'high',
      summary: 'Import de pacote interno não resolvido.',
      causes: diagnoseCrossPackage(input),
    }
  }

  // Build Vite
  if (/transform error|plugin error|vite|rollup|build failed/i.test(input)) {
    return {
      category: 'BUILD_VITE',
      confidence: 'high',
      summary: 'Erro durante o build do Vite.',
      causes: diagnoseBuildVite(input),
    }
  }

  // Turborepo pipeline
  if (/turbo|pipeline|dependson|cache miss|task.*fail/i.test(input)) {
    return {
      category: 'TURBO_PIPELINE',
      confidence: 'medium',
      summary: 'Falha na pipeline do Turborepo.',
      causes: diagnoseTurboPipeline(input),
    }
  }

  // Runtime JS
  if (/typeerror|referenceerror|cannot read|undefined is not|is not a function|null.*property/i.test(input)) {
    return {
      category: 'RUNTIME_JS',
      confidence: 'high',
      summary: 'Erro de runtime JavaScript/TypeScript.',
      causes: diagnoseRuntime(input),
    }
  }

  return {
    category: 'UNKNOWN',
    confidence: 'low',
    summary: 'Não foi possível classificar automaticamente.',
    causes: [{
      probability: 'média',
      description: 'Cole o stack trace completo para diagnóstico mais preciso.',
    }],
  }
}

// ── Diagnósticos por categoria ────────────────────────────────────────────────

function diagnose400(input: string): Cause[] {
  const causes: Cause[] = []

  if (/undefined|null/i.test(input)) {
    causes.push({
      probability: 'alta',
      description: 'Campo obrigatório chegando como undefined/null no payload.',
      fix: `
  Verifique os campos antes de enviar:
  
  // ❌ Problemático
  const body = { name: formData.name }   // pode ser undefined
  
  // ✅ Correto
  const body = { name: formData.name ?? '' }
  
  Ou valide com Zod no frontend antes do fetch:
  const parsed = MySchema.parse(formData)  // lança se inválido
  await apiFetch('/api/resource', { json: parsed })`,
    })
  }

  if (/content.type|header/i.test(input)) {
    causes.push({
      probability: 'alta',
      description: 'Content-Type header faltando ou incorreto.',
      fix: `
  Sempre inclua 'Content-Type': 'application/json' em POST/PUT/PATCH:
  
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  
  Ou use o fetch-wrapper da skill (já faz isso automaticamente):
  import { apiFetch } from '@/lib/fetch-wrapper'
  await apiFetch('/api/users', { json: data })`,
    })
  }

  if (/retry|react.query|mutation/i.test(input)) {
    causes.push({
      probability: 'média',
      description: 'React Query está retentando o request 400 desnecessariamente.',
      fix: `
  Configure o retry no QueryClient para não retentar erros 4xx:
  
  import { ApiError } from './fetch-wrapper'
  
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: (count, error) => {
          if (error instanceof ApiError && error.status < 500) return false
          return count < 2
        }
      }
    }
  })`,
    })
  }

  causes.push({
    probability: 'média',
    description: 'Schema Zod do backend rejeitando o payload por tipo errado.',
    fix: `
  Adicione logs temporários no handler do backend para ver o erro Zod:
  
  if (error instanceof ZodError) {
    console.log(JSON.stringify(error.flatten(), null, 2))
    return res.status(400).json({ issues: error.flatten() })
  }
  
  E no frontend, inspecione o body da resposta 400:
  const res = await fetch('/api/...')
  const body = await res.json()
  console.log('400 body:', body)  // vai mostrar quais campos falharam`,
  })

  return causes
}

function diagnoseCrossPackage(input: string): Cause[] {
  const monoRoot = detectMonorepoRoot()
  const causes: Cause[] = []

  // Extrair nome do pacote do erro
  const pkgMatch = input.match(/["'](@[\w-]+\/[\w-]+|packages\/[\w-]+)['"]/)?.[1]

  causes.push({
    probability: 'alta',
    description: `O vite.config.ts não tem alias para ${pkgMatch ?? 'o pacote interno'}.`,
    fix: `
  Em apps/[seu-app]/vite.config.ts, adicione:
  
  import { resolve } from 'path'
  
  export default defineConfig({
    resolve: {
      alias: {
        '${pkgMatch ?? '@repo/ui'}': resolve(__dirname, '../../packages/[nome]/src'),
      },
    },
  })
  
  Ou instale vite-tsconfig-paths para sincronizar automaticamente:
    pnpm add -D vite-tsconfig-paths
  
  E no vite.config.ts:
    import tsconfigPaths from 'vite-tsconfig-paths'
    plugins: [react(), tsconfigPaths()]`,
    autoFixable: false,
  })

  causes.push({
    probability: 'alta',
    description: 'O campo "exports" do package.json do pacote aponta para dist/ que não existe em dev.',
    fix: `
  Em packages/[nome]/package.json, use exports condicional:
  
  {
    "exports": {
      ".": {
        "development": "./src/index.ts",
        "default": "./dist/index.js"
      }
    },
    "main": "./src/index.ts"
  }`,
  })

  causes.push({
    probability: 'média',
    description: 'TypeScript paths no tsconfig.json não alinhado com o vite.config.ts.',
    fix: `
  tsconfig.base.json (raiz):
  {
    "compilerOptions": {
      "paths": {
        "${pkgMatch ?? '@repo/ui'}": ["./packages/[nome]/src/index.ts"]
      }
    }
  }
  
  O alias no vite.config.ts DEVE apontar para o mesmo arquivo.`,
  })

  return causes
}

function diagnoseBuildVite(input: string): Cause[] {
  return [
    {
      probability: 'alta',
      description: 'packages/* não buildou antes do app — problema de ordem no Turborepo.',
      fix: `
  turbo.json deve ter:
  {
    "pipeline": {
      "build": {
        "dependsOn": ["^build"],
        "outputs": ["dist/**"]
      }
    }
  }
  
  Rode para verificar o grafo:
    turbo run build --graph`,
    },
    {
      probability: 'média',
      description: 'Plugin do Vite conflitando com transpilação de pacote interno.',
      fix: `
  Adicione ao vite.config.ts do app afetado:
  
  optimizeDeps: {
    exclude: ['@repo/ui', '@repo/utils'],  // liste os packages internos
  }`,
    },
  ]
}

function diagnoseTurboPipeline(input: string): Cause[] {
  return [
    {
      probability: 'alta',
      description: 'Task sem "dependsOn": ["^build"] — builds executando fora de ordem.',
      fix: `
  turbo.json:
  {
    "pipeline": {
      "build": { "dependsOn": ["^build"] },
      "dev":   { "dependsOn": ["^build"], "cache": false, "persistent": true }
    }
  }`,
    },
    {
      probability: 'média',
      description: 'Cache corrompido do Turborepo.',
      fix: `
  Limpe o cache e re-execute:
    turbo run build --force
    
  Ou apague manualmente:
    rm -rf .turbo node_modules/.cache`,
      autoFixable: true,
      autoFixFn: async () => {
        const monoRoot = detectMonorepoRoot()
        const turboCache = path.join(monoRoot, '.turbo')
        if (fs.existsSync(turboCache)) {
          fs.rmSync(turboCache, { recursive: true })
          console.log('  🗑️  .turbo removido.')
        }
      },
    },
  ]
}

function diagnoseRuntime(input: string): Cause[] {
  const causes: Cause[] = []

  if (/cannot read.*undefined|of undefined/i.test(input)) {
    causes.push({
      probability: 'alta',
      description: 'Valor undefined sendo acessado (ex: data.map() quando data é undefined).',
      fix: `
  Padrões de guarda:
  
  // Optional chaining
  const items = data?.items ?? []
  
  // Em componentes React — aguardar dados carregarem
  if (!data) return <Loading />
  
  // Em hooks com React Query
  const { data = [] } = useQuery({ queryKey: ['items'], queryFn: fetchItems })`,
    })
  }

  if (/is not a function/i.test(input)) {
    causes.push({
      probability: 'alta',
      description: 'Chamando algo como função quando é undefined ou outro tipo.',
      fix: `
  Verifique o import e o export:
  
  // Certifique-se que está exportando como função:
  export function myFn() { ... }     // named export
  export default function myFn() { } // default export
  
  // E importando corretamente:
  import { myFn } from './myModule'  // para named
  import myFn from './myModule'      // para default`,
    })
  }

  causes.push({
    probability: 'média',
    description: 'Dado async acessado antes de resolver (race condition).',
    fix: `
  Use loading states explícitos:
  
  const { data, isLoading, isError } = useQuery(...)
  
  if (isLoading) return <Skeleton />
  if (isError) return <ErrorMessage />
  if (!data) return null
  
  return <Component data={data} />`,
  })

  return causes
}

// ── Extrator de contexto do stack trace ───────────────────────────────────────
function extractStackContext(input: string) {
  const lines = input.split('\n')
  const projectFrames = lines.filter(l =>
    l.includes('at ') && !l.includes('node_modules') && (l.includes('.tsx') || l.includes('.ts') || l.includes('.js'))
  )

  const firstFrame = projectFrames[0]
  if (!firstFrame) return null

  const match = firstFrame.match(/\((.+):(\d+):(\d+)\)/) ?? firstFrame.match(/at (.+):(\d+):(\d+)/)
  if (!match) return null

  return { file: match[1], line: match[2], col: match[3] }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔍 turborepo-error-debugger — Diagnóstico Interativo\n')

  let input: string

  if (FILE_FLAG) {
    input = fs.readFileSync(FILE_FLAG, 'utf-8')
    console.log(`  📄 Lendo erro de: ${FILE_FLAG}\n`)
  } else if (ERROR_FLAG) {
    input = ERROR_FLAG
  } else {
    console.log('  Cole o erro, stack trace ou descrição do problema.')
    console.log('  Pressione Enter duas vezes quando terminar.\n')
    const lines: string[] = []
    process.stdout.write('  > ')
    for await (const line of rl) {
      if (line === '' && lines.length > 0 && lines[lines.length - 1] === '') break
      lines.push(line)
      process.stdout.write('  > ')
    }
    input = lines.join('\n')
  }

  if (!input.trim()) {
    console.log('  Nenhum input fornecido. Saindo.')
    rl.close()
    return
  }

  // Classificar
  section('CLASSIFICAÇÃO')
  const result = classify(input)
  console.log(`  Categoria : ${result.category}`)
  console.log(`  Confiança : ${result.confidence}`)
  console.log(`  Resumo    : ${result.summary}`)

  // Contexto do stack
  const ctx = extractStackContext(input)
  if (ctx) {
    console.log(`\n  📍 Ponto de entrada do erro:`)
    console.log(`     ${ctx.file} — linha ${ctx.line}, col ${ctx.col}`)
  }

  // Causas
  section('CAUSAS PROVÁVEIS')
  result.causes.forEach((cause, i) => {
    console.log(`\n  ${i + 1}. [${cause.probability.toUpperCase()}] ${cause.description}`)
    if (cause.fix) {
      console.log('\n  Sugestão de fix:')
      cause.fix.split('\n').forEach(l => console.log(`  ${l}`))
    }
    if (cause.autoFixable) {
      console.log('\n  ⚡ Este fix pode ser aplicado automaticamente.')
    }
  })

  // Auto-fix
  const autoFixable = result.causes.filter(c => c.autoFixable && c.autoFixFn)
  if (autoFixable.length > 0) {
    section('FIXES AUTOMÁTICOS')
    if (AUTO_FIX) {
      for (const cause of autoFixable) {
        console.log(`  Aplicando: ${cause.description}`)
        await cause.autoFixFn!()
      }
    } else {
      console.log('  Fixes automáticos disponíveis. Rode com --fix para aplicar:')
      console.log('    npx tsx scripts/diagnose.ts --fix')
    }
  }

  // Próximos passos
  section('PRÓXIMOS PASSOS')
  switch (result.category) {
    case 'HTTP_400':
      console.log('  1. Inspecione o body da resposta 400 (network tab ou logs do servidor)')
      console.log('  2. Compare o payload enviado com o schema Zod esperado')
      console.log('  3. Use o fetch-wrapper (assets/fetch-wrapper.ts) para logs automáticos')
      console.log('  4. Rode: npx tsx scripts/test.ts --category 400')
      break
    case 'CROSS_PACKAGE':
      console.log('  1. Verifique o vite.config.ts do app afetado (resolve.alias)')
      console.log('  2. Verifique o package.json do pacote interno (exports)')
      console.log('  3. Rode: npx tsx scripts/diagnose.ts para re-analisar após o fix')
      break
    case 'RUNTIME_JS':
      console.log('  1. Adicione guarda no ponto de entrada identificado acima')
      console.log('  2. Verifique se o dado pode ser undefined antes de acessar propriedades')
      console.log('  3. Rode: npx tsx scripts/test.ts --category runtime')
      break
    case 'BUILD_VITE':
    case 'TURBO_PIPELINE':
      console.log('  1. Rode: turbo run build --verbosity=2 para ver o erro completo')
      console.log('  2. Verifique o turbo.json (dependsOn, outputs)')
      console.log('  3. Tente: turbo run build --force para ignorar cache')
      break
    default:
      console.log('  Cole o stack trace completo para diagnóstico mais preciso.')
  }

  console.log('\n')
  rl.close()
}

main().catch(e => { console.error('\n  ❌', e.message); rl.close(); process.exit(1) })
