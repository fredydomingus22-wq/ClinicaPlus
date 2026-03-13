# check-permissions.ps1
# Verifica se os ficheiros de rotas em apps/api/src/routes contêm chamadas a roleGuard

$routePath = "C:\Users\LENOVO\Documents\Projectos\ClinicaPlus\apps\api\src\routes"
$files = Get-ChildItem -Path $routePath -Filter "*.ts" -Recurse

Write-Host "--- Auditoria de Guardas de Role ---" -ForegroundColor Cyan

foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    if ($content -match "router\.(get|post|put|patch|delete)") {
        if ($content -notmatch "requireRole") {
            Write-Host "[ALERTA] Ficheiro sem requireRole: $($file.Name)" -ForegroundColor Yellow
        }
        else {
            Write-Host "[OK] $($file.Name)" -ForegroundColor Green
        }
    }
}

Write-Host "Auditoria concluída." -ForegroundColor Cyan
