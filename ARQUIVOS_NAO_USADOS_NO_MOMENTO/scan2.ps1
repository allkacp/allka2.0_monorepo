$base = "c:\Users\Usuário\Documents\Verificação\PLATAFORMA\allka-2026"
Set-Location $base

$activeFiles = @()
$activeFiles += Get-ChildItem -Path "app" -Recurse -Include "*.tsx","*.ts" | Select-Object -ExpandProperty FullName
$activeFiles += Get-ChildItem -Path "components" -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notlike "*\components\ui\*" } | Select-Object -ExpandProperty FullName
if (Test-Path "$base\App.tsx") { $activeFiles += "$base\App.tsx" }
if (Test-Path "$base\main.tsx") { $activeFiles += "$base\main.tsx" }

Write-Host "=== BROKEN IMPORTS SCAN ==="
Write-Host "Total active files: $($activeFiles.Count)"
Write-Host ""

$broken = @()

foreach ($f in $activeFiles) {
    if (-not (Test-Path $f)) { continue }
    $relFile = $f.Replace("$base\", "")
    $lines = Get-Content $f -ErrorAction SilentlyContinue
    if ($null -eq $lines) { continue }
    for ($i=0; $i -lt $lines.Count; $i++) {
        $line = $lines[$i]
        if ($line -match 'from\s+[''"]@/([^''"]+)[''"]') {
            $importPath = $Matches[1]
            $importPathWin = $importPath -replace '/', '\'
            $fullBase = Join-Path $base $importPathWin
            $c1 = "$fullBase.tsx"
            $c2 = "$fullBase.ts"
            $c3 = Join-Path "$fullBase" "index.tsx"
            $c4 = Join-Path "$fullBase" "index.ts"
            
            $found = (Test-Path $c1) -or (Test-Path $c2) -or (Test-Path $c3) -or (Test-Path $c4)
            
            if (-not $found) {
                $lineNum = $i + 1
                Write-Host "BROKEN | $relFile | L$lineNum | @/$importPath"
                $broken += "$relFile|$lineNum|$importPath"
            }
        }
    }
}

Write-Host ""
Write-Host "=== TOTAL BROKEN: $($broken.Count) ==="
Write-Host ""

# ORPHAN SCAN
Write-Host "=== ORPHAN COMPONENTS SCAN ==="

$componentFiles = Get-ChildItem -Path "components" -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notlike "*\components\ui\*" } | ForEach-Object {
    $_.FullName.Replace("$base\", "").Replace("\", "/")
}

# Collect all import targets
$allImportTargets = @{}

foreach ($f in $activeFiles) {
    if (-not (Test-Path $f)) { continue }
    $lines = Get-Content $f -ErrorAction SilentlyContinue
    if ($null -eq $lines) { continue }
    foreach ($line in $lines) {
        if ($line -match 'from\s+[''"]@/([^''"]+)[''"]') {
            $allImportTargets[$Matches[1]] = $true
        }
    }
}

foreach ($cf in $componentFiles) {
    $noExt = $cf -replace '\.(tsx|ts)$', ''
    if (-not $allImportTargets.ContainsKey($noExt)) {
        Write-Host "ORPHAN | $cf"
    }
}

Write-Host ""
Write-Host "=== DONE ==="
