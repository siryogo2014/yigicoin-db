# scripts/test-m12.ps1
# M12 INVITES + REGISTER TEST RUNNER

Set-StrictMode -Version 2.0

# Asegura que este archivo se ejecute desde la raíz del proyecto
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

# Carga helpers genéricos (Reset-Lab, Invoke-Api, etc.)
. (Join-Path $PSScriptRoot "lab-helpers.ps1")

# -----------------------
# Helpers de asserts
# -----------------------
function Fail([string]$Msg) {
    Write-Host "`n$Msg" -ForegroundColor Red
    throw $Msg
}

function Assert-True($cond, [string]$msg) {
    if (-not $cond) { Fail $msg }
}

function Assert-Equal($expected, $actual, [string]$msg) {
    if ($expected -ne $actual) {
        Fail "$msg (expected: '$expected', actual: '$actual')"
    }
}

# -----------------------
# Helpers específicos M11/M12
# -----------------------

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

    return $res
}

function Ensure-User([string]$Email) {
    Write-Host "Ensure-User $Email" -ForegroundColor Cyan

    try {
        $user = Invoke-Api -Method GET -Path "/api/dashboard/me?email=$Email"
    } catch {
        Fail "No se pudo llamar /api/dashboard/me para $Email. ¿Servidor corriendo?"
    }

    # Tu API devuelve el usuario PLANO (no envuelto en { user: ... })
    if (-not $user -or -not $user.id) {
        Fail "El usuario $Email no existe o /api/dashboard/me no devolvió datos válidos."
    }

    return $user
}

function Check-TreeIntegrity {
    param(
        [int]$MaxLevel = 4
    )

    $path = "/api/dev/slots/check-tree"
    if ($MaxLevel -gt 0) {
        # OJO: evitar que PowerShell lea "$path?maxLevel" como variable
        $path = "{0}?maxLevel={1}" -f $path, $MaxLevel
        # Alternativa válida:
        # $path = "${path}?maxLevel=$MaxLevel"
    }

    try {
        $res = Invoke-Api -Method GET -Path $path
    } catch {
        Fail "No se pudo llamar /api/dev/slots/check-tree. ¿Servidor corriendo?"
    }

    if (-not $res.ok) {
        Fail "Fallo /api/dev/slots/check-tree: $($res | ConvertTo-Json -Compress)"
    }

    return $res
}


Write-Host "==============================="
Write-Host " M12 INVITES + REGISTER TEST"
Write-Host "==============================="

# Email nuevo aleatorio para que el test sea idempotente
$rand = Get-Random -Maximum 999999
$NewUserEmail = "m12-invite-user-$rand@yigicoin.com"

try {
    Write-Host "`n== RESET LAB ==" -ForegroundColor Cyan
    $lab = Reset-Lab

    Write-Host "`nRESET LAB:`n" -ForegroundColor DarkCyan
    $lab | Format-Table -AutoSize

    $resetInv = Reset-Invites
    Write-Host ("Invites borrados: {0}" -f $resetInv.deleted)

    $demoUser = Ensure-User -Email "demo@yigicoin.com"
    $demoId = $demoUser.id
    Assert-True $demoId "No se pudo asegurar demo@yigicoin.com"

    # ======================
    # 1) Crear invites para demo
    # ======================
    Write-Host "`n== CREATE INVITES FOR DEMO ==" -ForegroundColor Cyan

    # Llamamos a /api/invites/create pero NO asumimos forma del JSON
    $null = Invoke-Api -Method POST -Path "/api/invites/create?email=demo@yigicoin.com"

    # El estado real lo leemos desde /api/invites/my
    $myInv = Invoke-Api -Method GET -Path "/api/invites/my?email=demo@yigicoin.com"
    $invites = $myInv.invites
    Assert-True $invites "No se devolvió lista de invites"

    $activeCount1 = ($invites | Where-Object { $_.status -eq "ACTIVE" }).Count
    Write-Host ("Invites activos después de create: {0}" -f $activeCount1)
    Assert-True ($activeCount1 -ge 1) "Se esperaba al menos 1 invite activo para demo"

    $firstInvite = $invites[0]
    $inviteCode = $firstInvite.code
    Assert-True $inviteCode "Invite sin código"

    Write-Host ("Usaremos invite code: {0}" -f $inviteCode) -ForegroundColor Yellow

    # ======================
    # 2) Intento de registro SIN invite (debe fallar)
    # ======================
    Write-Host "`n== REGISTER WITHOUT INVITE CODE (espera error) ==" -ForegroundColor Cyan

    $bodyWithoutCode = @{
        email    = $NewUserEmail
        password = "Test1234!"
        pin      = "1234"
    }

    $errorCaught = $false
    try {
        $resNoCode = Invoke-Api -Method POST -Path "/api/invites/register" -Body $bodyWithoutCode
        if ($resNoCode.ok -eq $true) {
            Fail "Se obtuvo ok=true al registrar sin código, se esperaba error."
        }
    } catch {
        $errorCaught = $true
    }
    Assert-True $errorCaught "Se esperaba error al registrar sin código de invitación"

    # ======================
    # 3) Registro correcto con invite válido
    # ======================
    Write-Host "`n== REGISTER WITH VALID INVITE ==" -ForegroundColor Cyan

    $bodyWithCode = @{
        code      = $inviteCode
        email     = $NewUserEmail
        password  = "Test1234!"
        pin       = "1234"
        firstName = "M12"
        lastName  = "Test"
        username  = "m12_test_user_$rand"
    }

    $regRes = Invoke-Api -Method POST -Path "/api/invites/register" -Body $bodyWithCode

    Assert-True $regRes.ok "Respuesta ok=false en /api/invites/register"
    $newUserId = $regRes.userId
    Assert-True $newUserId "userId vacío en respuesta de registro"

    Write-Host ("Nuevo userId: {0}" -f $newUserId)

    # Confirmar que el usuario existe vía /api/dashboard/me
    $meUser = Invoke-Api -Method GET -Path "/api/dashboard/me?email=$NewUserEmail"
    Assert-True $meUser "No se encontró el usuario recién registrado"
    Assert-Equal $NewUserEmail $meUser.email "Email del usuario devuelto no coincide"

    # ======================
    # 4) Verificar que el invite está CONSUMED
    # ======================
    Write-Host "`n== VERIFY INVITE CONSUMED ==" -ForegroundColor Cyan

    $myInv2 = Invoke-Api -Method GET -Path "/api/invites/my?email=demo@yigicoin.com"
    $invAfter = $myInv2.invites | Where-Object { $_.code -eq $inviteCode }

    Assert-True $invAfter "No se encontró el invite después del registro"

    $statusAfter = $invAfter.status
    Write-Host ("Estado invite después de registro: {0}" -f $statusAfter)

    Assert-Equal "CONSUMED" $statusAfter "Invite debería estar en estado CONSUMED"

    # ======================
    # 5) Intentar reutilizar el mismo invite (debe fallar)
    # ======================
    Write-Host "`n== REUSE SAME INVITE (espera error) ==" -ForegroundColor Cyan

    $bodyReuse = @{
        code     = $inviteCode
        email    = "m12-invite-user-2@yigicoin.com"
        password = "Test1234!"
        pin      = "1234"
    }

    $errorReuse = $false
    try {
        $resReuse = Invoke-Api -Method POST -Path "/api/invites/register" -Body $bodyReuse
        if ($resReuse.ok -eq $true) {
            Fail "Se obtuvo ok=true al reutilizar el mismo código, se esperaba error."
        }
    } catch {
        $errorReuse = $true
    }
    Assert-True $errorReuse "Se esperaba error al intentar reutilizar el mismo código"

    # ======================
    # 6) Verificar integridad del árbol de slots (M10)
    # ======================
    Write-Host "`n== TREE INTEGRITY AFTER M12 OPERATIONS ==" -ForegroundColor Cyan
    $check = Check-TreeIntegrity -MaxLevel 4

    $ok = $check.ok
    $totalSlots = $check.totalSlots
    $maxChildren = $check.maxChildrenPerParent

    $check | Format-Table -AutoSize

    Assert-True $ok "Árbol de slots NO cumple las invariantes después de M12"
    Assert-Equal 18 $totalSlots "Se esperaba 18 slots en el árbol base"
    Assert-Equal 2  $maxChildren "Se esperaba máximo 2 hijos por padre"

    Write-Host "`nÁrbol de slots sigue íntegro tras M12." -ForegroundColor Green
    Write-Host "`n✅ TODAS LAS PRUEBAS M12 PASARON" -ForegroundColor Green

} catch {
    Write-Host "`n❌ M12 NO ESTÁ CERRADO. Arregla el error arriba antes de seguir." -ForegroundColor Red
    throw
}
