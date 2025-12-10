# scripts/lab-m9.ps1
# Helpers para el LAB de slots M9
# Uso:
#   cd C:\Users\yon\Desktop\yigicoinn1.7
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   . .\scripts\lab-m9.ps1
#   Reset-Lab
#   Assign-Slot -Email "payer@test.com" -Label "A"
#   Expropriate -Email "payer@test.com"
#   Show-Tree -MaxLevel 3

Set-StrictMode -Version 2.0

# Carga helpers si existen (por ejemplo Invoke-Api más completo)
$helpersPath = Join-Path $PSScriptRoot "lab-helpers.ps1"
if (Test-Path $helpersPath) {
    . $helpersPath
}

# Si no existe Invoke-Api, define uno mínimo
if (-not (Get-Command Invoke-Api -ErrorAction SilentlyContinue)) {
    function Invoke-Api {
        param(
            [Parameter(Mandatory=$true)]
            [ValidateSet('GET','POST','PUT','PATCH','DELETE')]
            [string]$Method,

            [Parameter(Mandatory=$true)]
            [string]$Path,

            [object]$Body
        )

        $baseUrl = "http://localhost:3000"
        $url = "$baseUrl$Path"

        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            return Invoke-RestMethod -Method $Method -Uri $url -ContentType "application/json" -Body $json
        }

        return Invoke-RestMethod -Method $Method -Uri $url
    }
}

function Reset-Lab {
    Write-Host "`n== RESET LAB ==" -ForegroundColor Cyan

    # 1) reset owners
    try {
        $r1 = Invoke-Api -Method POST -Path "/api/dev/slots/reset-owners"
        Write-Host ("reset-owners ok: {0} count: {1}" -f $r1.ok, $r1.resetCount)
    } catch {
        Write-Host "reset-owners FAIL. Revisa/crea el endpoint." -ForegroundColor Red
        throw
    }

    # 2) reset logs
    try {
        $r2 = Invoke-Api -Method POST -Path "/api/dev/slots/reset-logs"
        Write-Host ("reset-logs ok: {0} deleted: {1}" -f $r2.ok, $r2.deleted)
    } catch {
        Write-Host "reset-logs WARNING (no fatal). Si no existe aún, créalo." -ForegroundColor Yellow
    }

    # 3) init slots
    $r3 = Invoke-Api -Method POST -Path "/api/dev/init-slots"

    $ok = $r3.ok
    $hasCreated = ($r3.PSObject.Properties.Name -contains "created")
    $hasAlready = ($r3.PSObject.Properties.Name -contains "alreadyInitialized")
    $hasCount = ($r3.PSObject.Properties.Name -contains "count")

    if ($hasCreated -and $r3.created) {
        Write-Host ("init-slots ok: {0} created: {1}" -f $ok, $r3.created)
    } elseif ($hasAlready -or $hasCount) {
        $already = if ($hasAlready) { $r3.alreadyInitialized } else { $true }
        $cnt = if ($hasCount) { $r3.count } else { "" }
        Write-Host ("init-slots ok: {0} alreadyInitialized: {1} count: {2}" -f $ok, $already, $cnt)
    } else {
        # fallback genérico por si cambiaste el shape del response
        Write-Host ("init-slots ok: {0}" -f $ok)
    }

    return $r3
}

function Assign-Slot {
    param(
        [Parameter(Mandatory=$true)][string]$Email,
        [Parameter(Mandatory=$true)][string]$Label
    )

    $body = @{ email = $Email; slotLabel = $Label }

    try {
        $res = Invoke-Api -Method POST -Path "/api/dev/slots/assign" -Body $body
        Write-Host ("assign {0} -> {1} OK" -f $Label, $Email) -ForegroundColor Green
        return $res
    } catch {
        Write-Host ("assign {0} -> {1} FAIL: {2}" -f $Label, $Email, $_.Exception.Message) -ForegroundColor Red
        Write-Host "Tip: verifica que el usuario exista en Prisma Studio." -ForegroundColor DarkYellow
        throw
    }
}

function Expropriate {
    param(
        [Parameter(Mandatory=$true)][string]$Email
    )

    try {
        $res = Invoke-Api -Method POST -Path "/api/dev/slots/expropriate?email=$Email"

        $caseName = $null
        if ($res.PSObject.Properties.Name -contains "caseResult") {
            if ($res.caseResult.PSObject.Properties.Name -contains "case") {
                $caseName = $res.caseResult.case
            }
        }

        if ($caseName) {
            Write-Host ("expropriate {0} OK -> {1}" -f $Email, $caseName) -ForegroundColor Cyan
        } else {
            Write-Host ("expropriate {0} OK" -f $Email) -ForegroundColor Cyan
        }

        if ($res.PSObject.Properties.Name -contains "addHours" -and $res.addHours) {
            $notify = if ($res.PSObject.Properties.Name -contains "notifyUserId") { $res.notifyUserId } else { "" }
            Write-Host ("addHours: {0} notifyUserId: {1}" -f $res.addHours, $notify) -ForegroundColor Yellow
        }

        return $res
    } catch {
        Write-Host ("expropriate {0} FAIL: {1}" -f $Email, $_.Exception.Message) -ForegroundColor Red
        throw
    }
}

function Show-Tree {
    param(
        [int]$MaxLevel = 2
    )

    try {
        $t = Invoke-Api -Method GET -Path "/api/dev/slots/tree?maxLevel=$MaxLevel"
        Write-Host ("`nTree (maxLevel={0}) ok: {1}" -f $MaxLevel, $t.ok) -ForegroundColor White
        return $t
    } catch {
        Write-Host ("tree FAIL: {0}" -f $_.Exception.Message) -ForegroundColor Red
        throw
    }
}
