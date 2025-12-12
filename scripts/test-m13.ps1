# scripts/test-m13.ps1
Write-Host ""
Write-Host "===============================" -ForegroundColor Cyan
Write-Host " M13 SUSPENSION RULES TEST" -ForegroundColor Cyan
Write-Host "===============================" -ForegroundColor Cyan
Write-Host ""

# Puedes cambiar esto si estás usando otro puerto/baseUrl.
$BaseUrl = "http://localhost:3000"

function Call-ApiJson {
    param(
        [Parameter(Mandatory = $true)][string]$Method,
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $false)]$Body
    )

    $url = "$BaseUrl$Path"

    if ($null -ne $Body) {
        $json = $Body | ConvertTo-Json -Depth 5
        return Invoke-RestMethod -Method $Method -Uri $url -ContentType "application/json" -Body $json
    }
    else {
        return Invoke-RestMethod -Method $Method -Uri $url
    }
}

$cases = @(
    @{
        Rank = "registrado"
        ExpectCanRecover = $false
        ExpectFineUSD    = 0
        ExpectGraceHours = 0
    },
    @{
        Rank = "invitado"
        ExpectCanRecover = $true
        ExpectFineUSD    = 10
        ExpectGraceHours = 96
    },
    @{
        Rank = "miembro"
        ExpectCanRecover = $true
        ExpectFineUSD    = 10
        ExpectGraceHours = 96
    },
    @{
        Rank = "vip"
        ExpectCanRecover = $true
        ExpectFineUSD    = 30
        ExpectGraceHours = 96
    },
    @{
        Rank = "premium"
        ExpectCanRecover = $true
        ExpectFineUSD    = 50
        ExpectGraceHours = 96
    },
    @{
        Rank = "elite"
        ExpectCanRecover = $true
        ExpectFineUSD    = 100
        ExpectGraceHours = 96
    }
)

$allOk = $true

foreach ($case in $cases) {
    $rank = $case.Rank
    Write-Host "== Testing rank '$rank' ==" -ForegroundColor Yellow

    try {
        $res = Call-ApiJson -Method "POST" -Path "/api/dev/suspension/preview" -Body @{
            rank = $rank
        }
    }
    catch {
        Write-Host "❌ Error llamando al endpoint para rank $rank" -ForegroundColor Red
        Write-Host $_
        $allOk = $false
        continue
    }

    if (-not $res.ok) {
        Write-Host ("❌ ok=false para rank {0}, code={1}" -f $rank, $res.code) -ForegroundColor Red
        $allOk = $false
        continue
    }

    if ($res.rank -ne $rank) {
        Write-Host ("❌ Rank devuelto '{0}' no coincide con esperado '{1}'" -f $res.rank, $rank) -ForegroundColor Red
        $allOk = $false
    }

    $rule = $res.rule

    if ($rule.fineUSD -ne $case.ExpectFineUSD) {
        Write-Host ("❌ fineUSD={0} esperado={1}" -f $rule.fineUSD, $case.ExpectFineUSD) -ForegroundColor Red
        $allOk = $false
    }

    if ($rule.canRecover -ne $case.ExpectCanRecover) {
        Write-Host ("❌ canRecover={0} esperado={1}" -f $rule.canRecover, $case.ExpectCanRecover) -ForegroundColor Red
        $allOk = $false
    }

    if ($rule.graceHours -ne $case.ExpectGraceHours) {
        Write-Host ("❌ graceHours={0} esperado={1}" -f $rule.graceHours, $case.ExpectGraceHours) -ForegroundColor Red
        $allOk = $false
    }

    if ($allOk) {
        Write-Host ("✅ Rank {0} OK (fineUSD={1}, canRecover={2}, graceHours={3})" -f `
            $rank,
            $rule.fineUSD,
            $rule.canRecover,
            $rule.graceHours
        ) -ForegroundColor Green
    }

    Write-Host ""
}

if ($allOk) {
    Write-Host "✅ TODAS LAS PRUEBAS M13 PASARON" -ForegroundColor Green
}
else {
    Write-Host "❌ M13 NO ESTÁ CERRADO. Revisa los errores arriba." -ForegroundColor Red
}
