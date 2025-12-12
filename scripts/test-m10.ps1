# scripts/test-m10.ps1
# M10 TREE INTEGRITY TEST RUNNER

Set-StrictMode -Version 2.0

# Asegúrate de ejecutar desde la raíz del proyecto
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Carga helpers del LAB (Reset-Lab, Invoke-Api, Show-Tree, etc.)
. (Join-Path $PSScriptRoot "lab-helpers.ps1")

# -----------------------
# Helpers de asserts
# -----------------------
function Fail([string]$Msg) {
    Write-Host $Msg -ForegroundColor Red
    throw $Msg
}

function Assert-True($Cond, [string]$Msg) {
    if (-not $Cond) {
        Fail $Msg
    }
}

# -----------------------
# Test principal M10
# -----------------------
function Test-TreeIntegrity {
    Write-Host "`n===============================" -ForegroundColor Cyan
    Write-Host " M10 TREE INTEGRITY TEST RUNNER " -ForegroundColor Cyan
    Write-Host "===============================" -ForegroundColor Cyan

    # 1) Partimos de LAB consistente
    Reset-Lab

    # 2) (Opcional) muestra el árbol actual hasta nivel 4
    $tree = Show-Tree -MaxLevel 4

    # 3) Llamamos al nuevo endpoint DEV
    try {
        $res = Invoke-Api -Method GET -Path "/api/dev/slots/check-tree"
    } catch {
        Fail "No se pudo llamar /api/dev/slots/check-tree. ¿Servidor corriendo y DEV mode activado?"
    }

    Write-Host "`ncheck-tree ok: $($res.ok) totalSlots: $($res.totalSlots) maxChildrenPerParent: $($res.maxChildrenPerParent)" -ForegroundColor Cyan

    if (-not $res.ok) {
        Write-Host "`nViolaciones detectadas:" -ForegroundColor Red
        foreach ($issue in $res.issues) {
            Write-Host ("- {0}: {1}" -f $issue.type, $issue.message) -ForegroundColor Red
        }
        Fail "El árbol de slots NO cumple las invariantes de M10."
    }

    Assert-True ($res.maxChildrenPerParent -le 2) "maxChildrenPerParent > 2, rompe tu regla binaria."

    Write-Host "`nÁrbol de slots cumple las invariantes básicas de M10." -ForegroundColor Green
}

# -----------------------
# Runner
# -----------------------
try {
    Test-TreeIntegrity
    Write-Host "`n✅ TODAS LAS PRUEBAS M10 PASARON" -ForegroundColor Green
} catch {
    Write-Host "`n❌ M10 NO ESTÁ CERRADO. Arregla el error arriba antes de seguir." -ForegroundColor Red
    throw
}
