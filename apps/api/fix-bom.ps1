$path = 'prisma/schema.prisma'
$bytes = [System.IO.File]::ReadAllBytes($path)
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    $stripped = New-Object byte[] ($bytes.Length - 3)
    [Array]::Copy($bytes, 3, $stripped, 0, $bytes.Length - 3)
    [System.IO.File]::WriteAllBytes($path, $stripped)
    Write-Host 'BOM removed successfully.'
} else {
    Write-Host 'No BOM found – file is clean.'
}
