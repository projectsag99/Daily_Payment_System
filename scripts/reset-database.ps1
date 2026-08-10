# Restaura la base de datos a estado limpio (solo admin, sin clientes/rutas).
# NO recupera datos viejos — solo borra lo acumulado después.
# Usage: .\scripts\reset-database.ps1

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "=== Reset de base de datos ===" -ForegroundColor Yellow
Write-Host "Esto BORRA clientes, rutas, créditos, pagos, Fraybentos, demo, etc."
Write-Host "Mantiene: esquema, migraciones, usuario admin."
Write-Host ""
$confirm = Read-Host "Escribe SI para continuar"
if ($confirm -ne "SI") {
  Write-Host "Cancelado."
  exit 0
}

$env:RESET_DB_CONFIRM = "1"
pnpm reset:db
pnpm bootstrap:admin
pnpm bootstrap:collector

Write-Host ""
Write-Host "Base limpia. Reinicia API y web, luego refresca el navegador." -ForegroundColor Green
Write-Host "Cobrador de prueba: cobrador@daily-payment.local (ver BOOTSTRAP_COLLECTOR_PASSWORD en .env)" -ForegroundColor Cyan
