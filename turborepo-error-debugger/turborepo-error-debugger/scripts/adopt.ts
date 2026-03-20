#!/usr/bin/env npx tsx
/**
 * adopt.ts
 *
 * Copia os assets da skill para o monorepo e aplica integrações automáticas.
 *
 * Uso:
 *   npx tsx scripts/adopt.ts
 *   npx tsx scripts/adopt.ts --app apps/dashboard   (especificar app alvo)
 *   npx tsx scripts/adopt.ts --dry-run              (ver o que seria feito sem escrever)
 */

import fs from 'fs'
import path from 'path'
import { execSync } from 'child_process'
import readline from 'readline'

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const TARGET_APP = args[args.indexOf('--app') + 1] ?? null

const SCRIPT_DIR = path.dirname(new URL(import.meta.url).pathname)
const SKILL_ROOT = path.resolve(SCRIPT_DIR, '..')

// ── Helpers ───────────────────────────────────────────────────────────────────
function log(msg: string) { console.log(`  ${msg}`) }
function ok(msg: string)  { console.log(`  ✅ ${msg}`) }
function info(msg: string){ console.log(`  ℹ️  ${msg}`) }
function warn(msg: string){ console.warn(`  ⚠️  ${msg}`) }
function err(msg: string) { console.error(`  ❌ ${msg}`) }

function write(dest: string, content: string) {
  if (DRY_RUN) {
    console.log(`\n  [DRY-RUN] Escreveria: ${dest}`)
    console.log('  ' + content.split('\n').slice(0, 6).join('\n  ') + '\n  ...')
    return
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, content, 'utf-8')
  ok(`Escrito: ${dest}`)
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => rl.question(`  ? ${question} `, ans => { rl.close(); resolve(ans.trim()) }))
}

// ── Detecção do monorepo ──────────────────────────────────────────────────────
function detectMonorepoRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'turbo.json'))) return dir
    dir = path.dirname(dir)
  }
  throw new Error('Não encontrei turbo.json. Rode este script da raiz do monorepo.')
}

function detectApps(root: string): string[] {
  const appsDir = path.join(root, 'apps')
  if (!fs.existsSync(appsDir)) return []
  return fs.readdirSync(appsDir)
    .filter(d => fs.existsSync(path.join(appsDir, d, 'package.json')))
    .map(d => `apps/${d}`)
}

function detectPackageManager(root: string): 'pnpm' | 'yarn' | 'npm' {
  if (fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

// ── Tarefas de adoção ─────────────────────────────────────────────────────────

function adoptFetchWrapper(appPath: string) {
  const dest = path.join(appPath, 'src/lib/fetch-wrapper.ts')
  if (fs.existsSync(dest)) {
    warn(`fetch-wrapper.ts já existe em ${dest} — pulando.`)
    return
  }
  const src = path.join(SKILL_ROOT, 'assets/fetch-wrapper.ts')
  const content = fs.readFileSync(src, 'utf-8')
  write(dest, content)
}

function adoptTestTemplate(appPath: string) {
  const dest = path.join(appPath, 'src/__tests__/api-error.test.ts')
  if (fs.existsSync(dest)) {
    warn(`api-error.test.ts já existe — pulando.`)
    return
  }
  const src = path.join(SKILL_ROOT, 'assets/test-template.ts')
  const content = fs.readFileSync(src, 'utf-8')
  write(dest, content)
}

function patchQueryClient(appPath: string) {
  // Tenta encontrar queryClient existente
  const candidates = [
    'src/lib/queryClient.ts',
    'src/lib/query-client.ts',
    'src/utils/queryClient.ts',
  ].map(p => path.join(appPath, p))

  const existing = candidates.find(p => fs.existsSync(p))

  const snippet = `
// ── Retry inteligente: não retentar erros 4xx ─────────────────────────────────
// Gerado por turborepo-error-debugger/scripts/adopt.ts
import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './fetch-wrapper'

const retryFn = (failureCount: number, error: unknown) => {
  if (error instanceof ApiError && error.status < 500) return false
  return failureCount < 2
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries:   { retry: retryFn, staleTime: 1000 * 60 },
    mutations: { retry: retryFn },
  },
})
`

  if (existing) {
    info(`queryClient existente encontrado em ${existing}`)
    info(`Adicione manualmente o bloco retry abaixo ou revise o arquivo:`)
    console.log('\n' + snippet)
  } else {
    write(path.join(appPath, 'src/lib/queryClient.ts'), snippet.trimStart())
  }
}

function checkViteAlias(appPath: string, monoRoot: string) {
  const viteConfig = path.join(appPath, 'vite.config.ts')
  if (!fs.existsSync(viteConfig)) {
    warn(`vite.config.ts não encontrado em ${appPath}`)
    return
  }
  const content = fs.readFileSync(viteConfig, 'utf-8')
  const packagesDir = path.join(monoRoot, 'packages')
  if (!fs.existsSync(packagesDir)) return

  const packages = fs.readdirSync(packagesDir)
    .filter(d => fs.existsSync(path.join(packagesDir, d, 'package.json')))

  const missing: string[] = []
  for (const pkg of packages) {
    const pkgJson = JSON.parse(fs.readFileSync(path.join(packagesDir, pkg, 'package.json'), 'utf-8'))
    const name: string = pkgJson.name ?? `@repo/${pkg}`
    if (!content.includes(name)) {
      missing.push(name)
    }
  }

  if (missing.length > 0) {
    warn(`Packages sem alias no vite.config.ts de ${appPath}:`)
    missing.forEach(m => {
      const rel = path.relative(appPath, path.join(packagesDir, m.split('/').pop()!, 'src'))
      console.log(`    // Adicionar em resolve.alias:`)
      console.log(`    '${m}': resolve(__dirname, '${rel}'),`)
    })
  } else {
    ok('vite.config.ts tem aliases para todos os packages internos.')
  }
}

function checkTurboJson(monoRoot: string) {
  const turboPath = path.join(monoRoot, 'turbo.json')
  const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf-8'))
  const pipeline = turbo.pipeline ?? turbo.tasks ?? {}
  const buildTask = pipeline['build'] ?? {}

  if (!buildTask.dependsOn?.includes('^build')) {
    warn(`turbo.json: task "build" não tem "dependsOn": ["^build"]`)
    info('Isso pode causar builds quebrados quando packages internos mudam.')
    info('Adicione: "dependsOn": ["^build"] na task "build" do turbo.json')
  } else {
    ok('turbo.json: build tem dependsOn correto (^build).')
  }

  const devTask = pipeline['dev'] ?? {}
  if (devTask.cache !== false) {
    warn(`turbo.json: task "dev" deve ter "cache": false`)
  } else {
    ok('turbo.json: dev tem cache: false.')
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🔧 turborepo-error-debugger — Adoção\n')

  if (DRY_RUN) info('Modo DRY-RUN ativado — nenhum arquivo será escrito.\n')

  const monoRoot = detectMonorepoRoot()
  info(`Monorepo detectado: ${monoRoot}`)

  const pm = detectPackageManager(monoRoot)
  info(`Package manager: ${pm}\n`)

  const apps = detectApps(monoRoot)
  if (apps.length === 0) {
    err('Nenhum app encontrado em apps/. Verifique a estrutura do monorepo.')
    process.exit(1)
  }

  let targetApp: string
  if (TARGET_APP) {
    targetApp = TARGET_APP
  } else if (apps.length === 1) {
    targetApp = apps[0]
    info(`App alvo: ${targetApp}`)
  } else {
    console.log('\n  Apps disponíveis:')
    apps.forEach((a, i) => console.log(`    ${i + 1}. ${a}`))
    const choice = await ask(`Qual app? (1-${apps.length}, ou "all"):`)
    if (choice === 'all') {
      for (const app of apps) await runForApp(path.join(monoRoot, app), monoRoot)
      checkTurboJson(monoRoot)
      console.log('\n✅ Adoção completa!\n')
      return
    }
    targetApp = apps[parseInt(choice) - 1]
  }

  await runForApp(path.join(monoRoot, targetApp), monoRoot)
  checkTurboJson(monoRoot)

  console.log('\n✅ Adoção completa!\n')
  if (!DRY_RUN) {
    info(`Próximo passo: rode  npx tsx scripts/test.ts  para validar a instalação.`)
  }
}

async function runForApp(appPath: string, monoRoot: string) {
  console.log(`\n  📦 Processando: ${path.relative(monoRoot, appPath)}\n`)
  adoptFetchWrapper(appPath)
  adoptTestTemplate(appPath)
  patchQueryClient(appPath)
  checkViteAlias(appPath, monoRoot)
}

main().catch(e => { err(e.message); process.exit(1) })
