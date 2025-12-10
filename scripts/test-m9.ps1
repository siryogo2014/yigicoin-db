# scripts/test-m9.ps1
# M9 LAB TEST RUNNER (one-click)

Set-StrictMode -Version 2.0

# Asegura que este archivo se ejecute desde la raíz del proyecto
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Carga funciones del LAB
. (Join-Path $PSScriptRoot "lab-m9.ps1")

# -----------------------
# Helpers de asserts
# -----------------------
function Fail([string]$Msg) {
    Write-Host "`n❌ $Msg" -ForegroundColor Red
    throw $Msg
}

function Assert-True([bool]$Cond, [string]$Msg) {
    if (-not $Cond) { Fail $Msg }
}

function Assert-Equal($Expected, $Actual, [string]$Msg) {
    if ($Expected -ne $Actual) {
        Fail ("{0} | Esperado: {1} | Actual: {2}" -f $Msg, $Expected, $Actual)
    }
}

function Get-SlotByLabel($Tree, [string]$Label) {
    $slots = $Tree.slots
    foreach ($s in $slots) {
        if ($s.label -eq $Label) { return $s }
    }
    return $null
}

function Expect-OwnerType($Tree, [string]$Label, [string]$OwnerType) {
    $slot = Get-SlotByLabel $Tree $Label
    Assert-True ($null -ne $slot) ("No se encontró el slot {0} en el tree." -f $Label)
    Assert-Equal $OwnerType $slot.ownerType ("ownerType incorrecto en slot {0}." -f $Label)
    return $slot
}

# -----------------------
# CASO 1
# Padre con 2 hijos USER -> PLATFORM reemplaza
# A = payer
# C = seller
# D = demo
# -----------------------
function Test-Case1 {
    Write-Host "`n===== CASE 1 =====" -ForegroundColor Cyan

    Reset-Lab | Out-Null

    $a = Assign-Slot -Email "payer@test.com" -Label "A"
    $c = Assign-Slot -Email "seller@test.com" -Label "C"
    $d = Assign-Slot -Email "demo@yigicoin.com" -Label "D"

    $res = Expropriate -Email "payer@test.com"

    Assert-True ($res.ok -eq $true) "La expropiación no devolvió ok=true en Caso 1."
    Assert-Equal "CASE_1_PLATFORM_REPLACES_PARENT_WITH_2_CHILDREN" $res.caseResult.case "CaseResult incorrecto en Caso 1."

    $tree = Show-Tree -MaxLevel 2

    Expect-OwnerType $tree "A" "PLATFORM" | Out-Null
    Expect-OwnerType $tree "C" "USER" | Out-Null
    Expect-OwnerType $tree "D" "USER" | Out-Null

    Write-Host "✅ Caso 1 OK" -ForegroundColor Green
}

# -----------------------
# CASO 2 + 3
# Padre con 1 hijo USER -> hijo asciende
# Slot original del hijo -> VACANT
# A = payer
# C = seller
# -----------------------
function Test-Case2_3 {
    Write-Host "`n===== CASE 2 + 3 =====" -ForegroundColor Cyan

    Reset-Lab | Out-Null

    $a = Assign-Slot -Email "payer@test.com" -Label "A"
    $c = Assign-Slot -Email "seller@test.com" -Label "C"

    # Guardamos el ownerUserId del hijo antes de expropiar
    $sellerUserId = $c.slot.ownerUserId

    $res = Expropriate -Email "payer@test.com"

    Assert-True ($res.ok -eq $true) "La expropiación no devolvió ok=true en Caso 2/3."
    Assert-Equal "CASE_2_SINGLE_CHILD_PROMOTES" $res.caseResult.case "CaseResult incorrecto en Caso 2/3."

    $tree = Show-Tree -MaxLevel 2

    $slotA = Expect-OwnerType $tree "A" "USER"
    $slotC = Expect-OwnerType $tree "C" "VACANT"

    Assert-Equal $sellerUserId $slotA.ownerUserId "En Caso 2/3, el dueño de A no coincide con el antiguo dueño de C."

    Write-Host "✅ Caso 2/3 OK" -ForegroundColor Green
}

# -----------------------
# CASO 4 (+48h)
# Padre sin hijos USER -> VACANT
# Abuelo USER recibe derecho +48h
# A = grand
# C = child
# -----------------------
function Test-Case4 {
    Write-Host "`n===== CASE 4 (+48h) =====" -ForegroundColor Cyan

    Reset-Lab | Out-Null

    $a = Assign-Slot -Email "grand@test.com" -Label "A"
    $c = Assign-Slot -Email "child@test.com" -Label "C"

    $grandUserId = $a.slot.ownerUserId

    $res = Expropriate -Email "child@test.com"

    Assert-True ($res.ok -eq $true) "La expropiación no devolvió ok=true en Caso 4."
    Assert-Equal "CASE_4_NO_CHILDREN_VACANT" $res.caseResult.case "CaseResult incorrecto en Caso 4."

    # Estas 3 validaciones son el corazón del Caso 4:
    Assert-True ($res.PSObject.Properties.Name -contains "addHours") "Caso 4 debía devolver addHours."
    Assert-Equal 48 $res.addHours "addHours incorrecto en Caso 4."
    Assert-Equal $grandUserId $res.notifyUserId "notifyUserId incorrecto en Caso 4."
    if ($res.PSObject.Properties.Name -contains "reinviteUserId") {
        Assert-Equal $grandUserId $res.reinviteUserId "reinviteUserId incorrecto en Caso 4."
    }

    $tree = Show-Tree -MaxLevel 3
    Expect-OwnerType $tree "C" "VACANT" | Out-Null

    Write-Host "✅ Caso 4 OK" -ForegroundColor Green
    Write-Host "Nota: verifica counterExpiresAt del notifyUserId en Prisma Studio si quieres confirmar el +48h a nivel de data." -ForegroundColor DarkYellow
}

# -----------------------
# EJECUCIÓN
# -----------------------
Write-Host "`n===============================" -ForegroundColor White
Write-Host " M9 LAB TEST RUNNER" -ForegroundColor White
Write-Host "===============================" -ForegroundColor White

Write-Host "`nNOTA: Asegúrate de que existan estos usuarios en Prisma Studio:" -ForegroundColor Yellow
Write-Host "payer@test.com, seller@test.com, demo@yigicoin.com, grand@test.com, child@test.com" -ForegroundColor Yellow

try {
    Test-Case1
    Test-Case2_3
    Test-Case4

    Write-Host "`n✅ TODAS LAS PRUEBAS M9 PASARON" -ForegroundColor Green
} catch {
    Write-Host "`n❌ M9 NO ESTÁ CERRADO. Arregla el error arriba antes de seguir." -ForegroundColor Red
    throw
}
