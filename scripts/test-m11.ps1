# scripts/test-m11.ps1
# M11 INVITES SYSTEM TEST RUNNER (one-click)

Set-StrictMode -Version 2.0

# Asegura que este archivo se ejecute desde la raíz del proyecto
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Carga helpers del LAB
. (Join-Path $PSScriptRoot "lab-helpers.ps1")

function Fail([string]$Msg) {
    Write-Host $Msg -ForegroundColor Red
    throw $Msg
}

function Assert-True($Condition, [string]$Msg) {
    if (-not $Condition) {
        Fail $Msg
    }
}

function Ensure-User([string]$Email) {
    Write-Host "Ensure-User $Email" -ForegroundColor Cyan

    try {
        $res = Invoke-Api -Method GET -Path "/api/dashboard/me?email=$Email"
    } catch {
        Fail "No se pudo llamar /api/dashboard/me para $Email. ¿Servidor corriendo?"
    }

    if (-not $res -or -not $res.id) {
        Fail "El usuario $Email no existe o /api/dashboard/me no devolvió datos válidos."
    }

    return $res
}

function Reset-Invites {
    Write-Host "Reset-Invites" -ForegroundColor Cyan

    try {
        $res = Invoke-Api -Method POST -Path "/api/dev/invites/reset"
    } catch {
        Fail "No se pudo llamar /api/dev/invites/reset. Revisa que exista app/api/dev/invites/reset/route.ts y que el servidor esté corriendo."
    }

    if (-not $res.ok) {
        Fail "Fallo /api/dev/invites/reset: $($res | ConvertTo-Json -Compress)"
    }

    Write-Host "Invites borrados: $($res.deleted)" -ForegroundColor DarkGray
}

function Test-M11-Invites {
    Write-Host "`n===============================" -ForegroundColor Yellow
    Write-Host " M11 INVITES BASIC TEST" -ForegroundColor Yellow
    Write-Host "===============================" -ForegroundColor Yellow

    # Prepara entorno de LAB (slots, logs, etc.)
    $lab = Reset-Lab
    Write-Host "`nRESET LAB:" -ForegroundColor Cyan
    $lab | Format-Table -AutoSize

    # Reset específico de invites
    Reset-Invites

    # Usa un usuario que ya existe en tu LAB (según instrucciones de M9)
    $owner = "demo@yigicoin.com"

    # Asegura usuario
    $user = Ensure-User -Email $owner

    # Primera llamada: debería crear hasta 2 enlaces
    Write-Host "`n== CREATE INVITES (1st call) ==" -ForegroundColor Cyan
    $res1 = Invoke-Api -Method POST -Path "/api/invites/create?email=$owner"

    if (-not $res1.ok) {
        Fail "Error en /api/invites/create (1): $($res1 | ConvertTo-Json -Compress)"
    }

    $count1 = $res1.invites.Count
    Write-Host "Invites activos después de primera llamada: $count1" -ForegroundColor Green

    Assert-True ($count1 -ge 1 -and $count1 -le 2) "Se esperaban 1-2 invites activos, se obtuvo $count1"

    $codes1 = $res1.invites | ForEach-Object { $_.code }

    # Segunda llamada: debe ser idempotente, sin crear más de 2
    Write-Host "`n== CREATE INVITES (2nd call, idempotent) ==" -ForegroundColor Cyan
    $res2 = Invoke-Api -Method POST -Path "/api/invites/create?email=$owner"

    if (-not $res2.ok) {
        Fail "Error en /api/invites/create (2): $($res2 | ConvertTo-Json -Compress)"
    }

    $count2 = $res2.invites.Count
    Write-Host "Invites activos después de segunda llamada: $count2" -ForegroundColor Green

    Assert-True ($count2 -eq $count1) "La segunda llamada cambió el número de invites activos ($count1 -> $count2)"
    Assert-True ($count2 -le 2) "Más de 2 invites activos ($count2)"

    $codes2 = $res2.invites | ForEach-Object { $_.code }

    $joined1 = [String]::Join(",", ($codes1 | Sort-Object))
    $joined2 = [String]::Join(",", ($codes2 | Sort-Object))

    Assert-True ($joined1 -eq $joined2) "Las llamadas no son idempotentes: códigos cambiaron."

    # GET /api/invites/my debe devolver al menos esos invites
    Write-Host "`n== LIST INVITES ==" -ForegroundColor Cyan
    $list = Invoke-Api -Method GET -Path "/api/invites/my?email=$owner"

    if (-not $list.ok) {
        Fail "Error en /api/invites/my: $($list | ConvertTo-Json -Compress)"
    }

    $countList = $list.invites.Count
    Write-Host "Invites retornados por /api/invites/my: $countList" -ForegroundColor Green

    Assert-True ($countList -ge $count2) "Lista de invites no coincide, esperaba al menos $count2 y obtuve $countList"

    Write-Host "`nÁrbol de slots sigue íntegro tras operaciones de invites:" -ForegroundColor Cyan
    $treeCheck = Invoke-Api -Method GET -Path "/api/dev/slots/check-tree"

    if (-not $treeCheck.ok) {
        Fail "Fallo /api/dev/slots/check-tree: $($treeCheck | ConvertTo-Json -Compress)"
    }

    Write-Host ($treeCheck | Format-Table -AutoSize | Out-String)

    Assert-True ($treeCheck.maxChildrenPerParent -le 2) "Algún padre tiene más de 2 hijos después de M11"

    Write-Host "`n✅ M11 INVITES: pruebas básicas OK" -ForegroundColor Green
}

try {
    Test-M11-Invites

    Write-Host "`n✅ TODAS LAS PRUEBAS M11 PASARON" -ForegroundColor Green
} catch {
    Write-Host "`n❌ M11 NO ESTÁ CERRADO. Arregla el error arriba antes de seguir." -ForegroundColor Red
    throw
}
