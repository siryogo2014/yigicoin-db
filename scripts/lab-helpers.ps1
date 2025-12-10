# scripts/lab-helpers.ps1
# Helpers LAB para M6/M7/M9
# NO ejecuta tests automáticamente.
# Cárgalo con:
#   . .\scripts\lab-helpers.ps1

$script:BaseUrl = "http://localhost:3000"

function Set-LabBaseUrl {
    param([Parameter(Mandatory=$true)][string]$Url)
    $script:BaseUrl = $Url.TrimEnd("/")
    Write-Host "BaseUrl set to $script:BaseUrl" -ForegroundColor Cyan
}

function Invoke-Api {
    param(
        [Parameter(Mandatory=$true)][ValidateSet("GET","POST")][string]$Method,
        [Parameter(Mandatory=$true)][string]$Path,
        [object]$Body = $null
    )

    $url = "$script:BaseUrl$Path"

    if ($Body -ne $null) {
        $json = $Body | ConvertTo-Json -Depth 10
        return Invoke-RestMethod -Method $Method -Uri $url -ContentType "application/json" -Body $json
    } else {
        return Invoke-RestMethod -Method $Method -Uri $url
    }
}

function Reset-Lab {
    Write-Host "`n== RESET LAB ==" -ForegroundColor Cyan

    try {
        $r1 = Invoke-Api -Method POST -Path "/api/dev/slots/reset-owners"
        Write-Host "reset-owners ok: $($r1.ok) count: $($r1.resetCount)"
    } catch {
        Write-Host "reset-owners FAIL. Endpoint faltante o DEV mode apagado." -ForegroundColor Red
        throw
    }

    try {
        $r2 = Invoke-Api -Method POST -Path "/api/dev/slots/reset-logs"
        Write-Host "reset-logs ok: $($r2.ok) deleted: $($r2.deleted)"
    } catch {
        Write-Host "reset-logs FAIL. Si aún no lo creaste, ignóralo." -ForegroundColor Yellow
        # no fatal
    }

    $r3 = Invoke-Api -Method POST -Path "/api/dev/init-slots"
    Write-Host "init-slots ok: $($r3.ok) created/already: $($r3.created)$($r3.alreadyInitialized)"
}

function Assign-Slot {
    param(
        [Parameter(Mandatory=$true)][string]$Email,
        [Parameter(Mandatory=$true)][string]$Label
    )

    $body = @{ email = $Email; slotLabel = $Label }

    try {
        $res = Invoke-Api -Method POST -Path "/api/dev/slots/assign" -Body $body
        Write-Host "assign $Label -> $Email OK"
        return $res
    } catch {
        Write-Host "assign $Label -> $Email FAIL: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Tip: confirma que el usuario existe en Prisma Studio." -ForegroundColor DarkYellow
        throw
    }
}

function Expropriate {
    param([Parameter(Mandatory=$true)][string]$Email)

    $res = Invoke-Api -Method POST -Path "/api/dev/slots/expropriate?email=$Email"
    Write-Host "expropriate $Email OK -> $($res.caseResult.case)"

    if ($res.addHours) {
        Write-Host "addHours: $($res.addHours) notifyUserId: $($res.notifyUserId)"
    }

    return $res
}

function Show-Tree {
    param([int]$MaxLevel = 2)

    $t = Invoke-Api -Method GET -Path "/api/dev/slots/tree?maxLevel=$MaxLevel"
    Write-Host "`nTree (maxLevel=$MaxLevel) ok: $($t.ok)"
    return $t
}

function Preview-Sponsors {
    param([Parameter(Mandatory=$true)][string]$Email)

    $res = Invoke-Api -Method GET -Path "/api/dev/sponsors/preview?email=$Email"
    Write-Host "preview sponsors for $Email ok: $($res.ok)"
    return $res
}
