#!/usr/bin/env npx tsx
/**
 * test.ts
 *
 * Roda os testes de integração da skill no monorepo e reporta resultados.
 * Valida que o fetch-wrapper, error handling e tipos estão corretos.
 *
 * Uso:
 *   npx tsx scripts/test.ts                          (todos os testes)
 *   npx tsx scripts/test.ts --category 400           (só testes de 400)
 *   npx tsx scripts/test.ts --category runtime       (só runtime errors)
 *   npx tsx scripts/test.ts --category cross-package (só imports)
 *   npx tsx scripts/test.ts --watch                  (modo watch)
 *   npx tsx scripts/test.ts --generate               (gera testes para o app)
 */

import fs from 'fs'
import path from 'path'
import { execSync, spawn } from 'child_process'

const args = process.argv.slice(2)
const CATEGORY = args[args.indexOf('--category') + 1] ?? 'all'
const WATCH    = args.includes('--watch')
const GENERATE = args.includes('--generate')

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok(msg: string)   { console.log(`  ✅ ${msg}`) }
function fail(msg: string) { console.log(`  ❌ ${msg}`) }
function info(msg: string) { console.log(`  ℹ️  ${msg}`) }
function warn(msg: string) { console.log(`  ⚠️  ${msg}`) }

function detectMonorepoRoot(): string {
  let dir = process.cwd()
  while (dir !== '/') {
    if (fs.existsSync(path.join(dir, 'turbo.json'))) return dir
    dir = path.dirname(dir)
  }
  return process.cwd()
}

function detectPackageManager(root: string): 'pnpm' | 'yarn' | 'npm' {
  if (fs.existsSync(path.join(root, 'pnpm-workspace.yaml'))) return 'pnpm'
  if (fs.existsSync(path.join(root, 'yarn.lock'))) return 'yarn'
  return 'npm'
}

function hasVitest(appPath: string): boolean {
  const pkg = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf-8'))
  return !!(pkg.devDependencies?.vitest ?? pkg.dependencies?.vitest)
}

// ── Verificações estáticas (sem rodar Vitest) ─────────────────────────────────
function runStaticChecks(monoRoot: string): { passed: number; failed: number } {
  let passed = 0
  let failed = 0

  console.log('\n  📋 Verificações estáticas...\n')

  // 1. turbo.json
  const turboPath = path.join(monoRoot, 'turbo.json')
  if (fs.existsSync(turboPath)) {
    const turbo = JSON.parse(fs.readFileSync(turboPath, 'utf-8'))
    const pipeline = turbo.pipeline ?? turbo.tasks ?? {}

    if (pipeline['build']?.dependsOn?.includes('^build')) {
      ok('turbo.json: build.dependsOn tem "^build"')
      passed++
    } else {
      fail('turbo.json: build.dependsOn não tem "^build" — packages podem buildar fora de ordem')
      failed++
    }

    if (pipeline['dev']?.cache === false) {
      ok('turbo.json: dev.cache é false')
      passed++
    } else {
      warn('turbo.json: dev.cache deveria ser false para hot reload funcionar')
    }
  }

  // 2. Packages internos com exports corretos
  const packagesDir = path.join(monoRoot, 'packages')
  if (fs.existsSync(packagesDir)) {
    const packages = fs.readdirSync(packagesDir)
      .filter(d => fs.existsSync(path.join(packagesDir, d, 'package.json')))

    for (const pkg of packages) {
      const pkgJson = JSON.parse(
        fs.readFileSync(path.join(packagesDir, pkg, 'package.json'), 'utf-8')
      )

      const exportsField = pkgJson.exports
      if (!exportsField) {
        warn(`packages/${pkg}: sem campo "exports" no package.json`)
        continue
      }

      // Verificar se dist/ existe quando exports aponta para ela
      const mainExport = exportsField['.'] ?? exportsField
      const defaultExport = typeof mainExport === 'string'
        ? mainExport
        : mainExport?.default ?? mainExport?.import

      if (defaultExport?.includes('dist/')) {
        const distPath = path.join(packagesDir, pkg, defaultExport.replace('./', ''))
        if (!fs.existsSync(distPath)) {
          fail(`packages/${pkg}: exports aponta para ${defaultExport} mas arquivo não existe — rode pnpm build no pacote`)
          failed++
        } else {
          ok(`packages/${pkg}: dist/ existe`)
          passed++
        }
      }

      // Verificar se tem campo "development" para dev
      if (typeof mainExport === 'object' && !mainExport.development) {
        warn(`packages/${pkg}: sem "development" em exports — pode causar problemas no modo dev`)
      }
    }
  }

  // 3. Apps com fetch-wrapper instalado
  const appsDir = path.join(monoRoot, 'apps')
  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir)
      .filter(d => fs.existsSync(path.join(appsDir, d, 'package.json')))

    for (const app of apps) {
      const appPath = path.join(appsDir, app)
      const wrapperPath = path.join(appPath, 'src/lib/fetch-wrapper.ts')

      if (fs.existsSync(wrapperPath)) {
        ok(`apps/${app}: fetch-wrapper.ts instalado`)
        passed++

        // Verificar se ApiError está sendo usada no retry
        const content = fs.readFileSync(wrapperPath, 'utf-8')
        if (content.includes('ApiError')) {
          ok(`apps/${app}: ApiError definido no fetch-wrapper`)
          passed++
        } else {
          warn(`apps/${app}: fetch-wrapper sem ApiError — retry do React Query pode não funcionar corretamente`)
        }
      } else {
        warn(`apps/${app}: fetch-wrapper.ts não instalado — rode: npx tsx scripts/adopt.ts`)
      }

      // Verificar vite.config.ts
      const viteConfig = path.join(appPath, 'vite.config.ts')
      if (fs.existsSync(viteConfig)) {
        const viteContent = fs.readFileSync(viteConfig, 'utf-8')
        if (viteContent.includes('resolve') && viteContent.includes('alias')) {
          ok(`apps/${app}: vite.config.ts tem resolve.alias`)
          passed++
        } else {
          warn(`apps/${app}: vite.config.ts sem resolve.alias — imports de packages/* podem falhar`)
        }
      }
    }
  }

  return { passed, failed }
}

// ── Testes Vitest ─────────────────────────────────────────────────────────────
function runVitestInApp(appPath: string, filter?: string): Promise<boolean> {
  return new Promise(resolve => {
    const pm = detectPackageManager(detectMonorepoRoot())
    const vitestArgs = ['vitest', 'run', '--reporter=verbose']

    if (filter) vitestArgs.push('--reporter=verbose', filter)
    if (WATCH)  { vitestArgs[1] = 'watch'; }

    const cmd = pm === 'pnpm' ? 'pnpm' : pm === 'yarn' ? 'yarn' : 'npx'
    const cmdArgs = pm === 'npm' ? ['npx', ...vitestArgs] : vitestArgs

    console.log(`\n  🧪 Rodando Vitest em ${path.basename(appPath)}...\n`)

    const child = spawn(cmd, cmdArgs, {
      cwd: appPath,
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    })

    child.on('close', code => resolve(code === 0))
  })
}

// ── Geração de testes ─────────────────────────────────────────────────────────
function generateTests(appPath: string) {
  const SKILL_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
  const template = fs.readFileSync(path.join(SKILL_ROOT, 'assets/test-template.ts'), 'utf-8')
  const dest = path.join(appPath, 'src/__tests__/api-errors.test.ts')

  if (fs.existsSync(dest)) {
    warn(`${dest} já existe. Sobrescrever? (s/n)`)
    // Em modo não-interativo, pula
    return
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, template)
  ok(`Teste gerado: ${dest}`)
  info('Adapte as seções marcadas com [ADAPTAR] para o seu código.')
}

// ── Relatório de cobertura de erros ──────────────────────────────────────────
function checkErrorCoverage(monoRoot: string) {
  console.log('\n  📊 Cobertura de tratamento de erros...\n')

  const appsDir = path.join(monoRoot, 'apps')
  if (!fs.existsSync(appsDir)) return

  const apps = fs.readdirSync(appsDir)
    .filter(d => fs.existsSync(path.join(appsDir, d, 'package.json')))

  for (const app of apps) {
    const appSrc = path.join(appsDir, app, 'src')
    if (!fs.existsSync(appSrc)) continue

    let fetchCount = 0
    let guardedCount = 0
    let unguardedFetches: string[] = []

    // Busca recursiva por arquivos .ts/.tsx
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(full)
        } else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) {
          const content = fs.readFileSync(full, 'utf-8')
          const lines = content.split('\n')

          lines.forEach((line, i) => {
            // Detectar fetch() ou apiFetch() sem try/catch visível nas linhas próximas
            if (/\bfetch\(|apiFetch\(/.test(line) && !line.includes('//')) {
              fetchCount++
              const context = lines.slice(Math.max(0, i - 5), i + 5).join('\n')
              if (/try\s*{|\.catch\(|onError/.test(context)) {
                guardedCount++
              } else {
                const rel = path.relative(monoRoot, full)
                unguardedFetches.push(`${rel}:${i + 1}`)
              }
            }
          })
        }
      }
    }

    walk(appSrc)

    if (fetchCount === 0) {
      info(`apps/${app}: sem chamadas fetch detectadas`)
      continue
    }

    const pct = Math.round((guardedCount / fetchCount) * 100)
    const icon = pct >= 80 ? '✅' : pct >= 50 ? '⚠️ ' : '❌'
    console.log(`  ${icon} apps/${app}: ${guardedCount}/${fetchCount} fetches com tratamento de erro (${pct}%)`)

    if (unguardedFetches.length > 0 && unguardedFetches.length <= 5) {
      unguardedFetches.forEach(f => console.log(`       → ${f}`))
    } else if (unguardedFetches.length > 5) {
      console.log(`       → e mais ${unguardedFetches.length - 5} ocorrências...`)
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🧪 turborepo-error-debugger — Testes e Validação\n')

  const monoRoot = detectMonorepoRoot()
  info(`Monorepo: ${monoRoot}`)

  // Verificações estáticas sempre
  const { passed, failed } = runStaticChecks(monoRoot)
  console.log(`\n  Estáticos: ${passed} passou, ${failed} falharam`)

  // Cobertura de erros
  checkErrorCoverage(monoRoot)

  // Geração de testes
  if (GENERATE) {
    console.log('\n  📝 Gerando testes...\n')
    const appsDir = path.join(monoRoot, 'apps')
    if (fs.existsSync(appsDir)) {
      const apps = fs.readdirSync(appsDir)
        .filter(d => fs.existsSync(path.join(appsDir, d, 'package.json')))
      apps.forEach(app => generateTests(path.join(appsDir, app)))
    }
  }

  // Rodar Vitest nas apps que têm
  const appsDir = path.join(monoRoot, 'apps')
  if (fs.existsSync(appsDir)) {
    const apps = fs.readdirSync(appsDir)
      .filter(d => fs.existsSync(path.join(appsDir, d, 'package.json')))
      .filter(d => hasVitest(path.join(appsDir, d)))

    if (apps.length === 0) {
      warn('\nNenhum app com Vitest encontrado.')
      info('Para instalar: pnpm add -D vitest @testing-library/react jsdom')
    } else {
      const filterMap: Record<string, string> = {
        '400': '400|api-error|fetch',
        'runtime': 'runtime|undefined|null',
        'cross-package': 'import|resolve|module',
      }
      const filter = CATEGORY !== 'all' ? filterMap[CATEGORY] : undefined

      let allPassed = true
      for (const app of apps) {
        const passed = await runVitestInApp(path.join(appsDir, app), filter)
        if (!passed) allPassed = false
      }

      console.log('\n')
      if (allPassed) {
        ok('Todos os testes passaram!')
      } else {
        fail('Alguns testes falharam. Revise os erros acima.')
        process.exit(1)
      }
    }
  }

  console.log('\n')
}

main().catch(e => { console.error('\n  ❌', e.message); process.exit(1) })
