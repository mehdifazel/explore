# Build Nobitex withdraw networks database from API (includes withdrawal fees)
# Run: .\scripts\build-withdraw-db.ps1

$apiUrl = "https://apiv2.nobitex.ir/v2/options"
$outputPath = "data/nobitex-withdraw-networks.json"

Write-Host "Fetching from Nobitex API..."
try {
    $response = Invoke-WebRequest -Uri $apiUrl -UseBasicParsing -TimeoutSec 30
    $data = $response.Content | ConvertFrom-Json
} catch {
    Write-Host "Error: $_"
    exit 1
}

if ($data.status -ne "ok" -or -not $data.coins) {
    Write-Host "Invalid API response"
    exit 1
}

# Parse fee string: "0.015" or "4_000_0.00000000" (underscores = thousand sep)
function Parse-Fee($s) {
    if (-not $s) { return $null }
    $clean = ($s -as [string]) -replace '_', ''
    $num = 0.0
    if ([double]::TryParse($clean, [System.Globalization.NumberStyles]::Any, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$num)) {
        return $num.ToString("0.########", [System.Globalization.CultureInfo]::InvariantCulture)
    }
    return $s
}

$db = [ordered]@{}
foreach ($c in $data.coins) {
    $coin = ($c.coin -as [string]).ToLower()
    if (-not $coin) { continue }
    
    $networks = @()
    $fees = @{}
    $coinUpper = ($c.coin -as [string]).ToUpper()
    
    foreach ($key in $c.networkList.PSObject.Properties.Name) {
        $n = $c.networkList.$key
        if ($n -and $n.withdrawEnable) {
            $name = if ($n.name) { $n.name } elseif ($n.network) { $n.network } else { "" }
            if ($name) {
                $networks += $name
                $feeAmount = Parse-Fee $n.withdrawFee
                if ($feeAmount) {
                    $fees[$name] = @{ amount = $feeAmount; coin = $coinUpper }
                }
            }
        }
    }
    
    if ($networks.Count -gt 0) {
        $entry = @{ networks = $networks }
        if ($fees.Count -gt 0) { $entry.fees = $fees }
        $db[$coin] = $entry
    }
}

$jsonPretty = $db | ConvertTo-Json -Depth 4 -Compress:$false

$outDir = Split-Path $outputPath
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$jsonPretty | Set-Content -Path $outputPath -Encoding UTF8 -NoNewline

Write-Host "Created $outputPath with $($db.Count) coins"
