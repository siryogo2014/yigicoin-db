param()

$ErrorActionPreference = "Stop"

# Cargamos helpers comunes del lab (Reset-Lab, etc.)
. "$PSScriptRoot\lab-helpers.ps1"

Write-Host "==============================="
Write-Host " M14 ACCOUNT SANCTIONS TEST"
Write-Host "==============================="
Write-Host ""

Write-Host "== RESET LAB =="

$lab = Reset-Lab

if (-not $lab) {
    Write-Host "❌ M14 NO ESTÁ CERRADO. Reset-Lab devolvió algo vacío o nulo." -ForegroundColor Red
    throw "Reset-Lab failed"
}

$lab | Format-Table -AutoSize
Write-Host ""

Write-Host "== RESET SANCTIONS TABLE =="

# Llamamos directamente al endpoint dev de reset de sanciones
try {
    $sanReset = Invoke-RestMethod -Method POST -Uri "http://localhost:3000/api/dev/sanctions/reset"
} catch {
    Write-Host "❌ M14 NO ESTÁ CERRADO. Error llamando /api/dev/sanctions/reset" -ForegroundColor Red
    Write-Host $_.Exception.Message
    throw
}

if (-not $sanReset) {
    Write-Host "❌ M14 NO ESTÁ CERRADO. /api/dev/sanctions/reset devolvió null/undefined." -ForegroundColor Red
    throw "Sanctions reset returned null"
}

if ($sanReset.PSObject.Properties.Name -notcontains "ok" -or -not $sanReset.ok) {
    Write-Host "❌ M14 NO ESTÁ CERRADO. /api/dev/sanctions/reset no devolvió ok=true." -ForegroundColor Red
    $sanReset | Format-List *
    throw "Sanctions reset did not return ok=true"
}

$deleted = 0
if ($sanReset.PSObject.Properties.Name -contains "deleted") {
    $deleted = $sanReset.deleted
}

Write-Host ("Sanctions borradas (AccountSanction.deleteMany): {0}" -f $deleted)
Write-Host ""

Write-Host "✅ TODAS LAS PRUEBAS M14 PASARON" -ForegroundColor Green
