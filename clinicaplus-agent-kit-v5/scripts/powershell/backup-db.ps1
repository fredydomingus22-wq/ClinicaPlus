# backup-db.ps1 — ClinicaPlus
param(
  [string]$Dest     = ($env:BACKUP_DEST ?? "local"),
  [int]   $KeepDays = ($env:BACKUP_KEEP_DAYS ?? 30)
)

$Timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$Filename   = "clinicaplus_${Timestamp}.sql"
$BackupDir  = $env:BACKUP_DIR ?? "$env:TEMP\clinicaplus-backups"

New-Item -ItemType Directory -Force -Path $BackupDir | Out-Null

Write-Host "[backup] Iniciando backup — $Timestamp"

# Dump (requer pg_dump no PATH)
$env:PGPASSWORD = ([System.Uri]$env:DATABASE_URL).UserInfo.Split(':')[1]
& pg_dump $env:DATABASE_URL -f "$BackupDir\$Filename"

# Compress
Compress-Archive -Path "$BackupDir\$Filename" -DestinationPath "$BackupDir\${Filename}.zip" -Force
Remove-Item "$BackupDir\$Filename"
$Filename = "${Filename}.zip"

$Size = (Get-Item "$BackupDir\$Filename").Length / 1MB
Write-Host "[backup] $(([char]0x2713)) Dump completo — $([math]::Round($Size,1)) MB"

# Upload S3 (opcional — requer AWS CLI)
if ($Dest -eq "s3") {
  & aws s3 cp "$BackupDir\$Filename" "s3://$env:BACKUP_S3_BUCKET/backups/$Filename"
  Write-Host "[backup] $(([char]0x2713)) Uploaded para S3"
  Remove-Item "$BackupDir\$Filename"
}

# Limpar antigos
Get-ChildItem "$BackupDir" -Filter "clinicaplus_*.zip" |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$KeepDays) } |
  Remove-Item
Write-Host "[backup] $(([char]0x2713)) Backups com mais de $KeepDays dias removidos"
Write-Host "[backup] $(([char]0x2713)) Concluído — $Filename"
