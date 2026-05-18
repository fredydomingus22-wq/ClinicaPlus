# ClinicaPlus - Script de Iniciação Completo
# Certifica-te de que o Docker Desktop está a correr.

Write-Host "🚀 A iniciar a infraestrutura ClinicaPlus..." -ForegroundColor Cyan

# 1. Iniciar Base de Dados e Redis
docker compose up -d
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao iniciar containers Docker." -ForegroundColor Red
    exit $LASTEXITCODE
}

Write-Host "⏳ A aguardar que a Base de Dados esteja pronta..." -ForegroundColor Yellow"
Start-Sleep -Seconds 5

# 2. Preparar Prisma e Base de Dados
Write-Host "🛠️ A preparar o Prisma e a Base de Dados..." -ForegroundColor Cyan"
pnpm db:generate
pnpm db:migrate deploy
pnpm db:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erro ao preparar a base de dados (Migrate/Seed)." -ForegroundColor Red
    exit $LASTEXITCODE
}

# 3. Iniciar Servidores de Desenvolvimento (API e WEB via Turbo)
Write-Host "🔥 A iniciar os servidores de desenvolvimento (Turborepo)..."
pnpm dev
