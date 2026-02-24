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
            $resolvedPaths = @(
                (Join-Path $base ($importPath -replace '/', '\')).ToString() + ".tsx",
                (Join-Path $base ($importPath -replace '/', '\')).ToString() + ".ts",
                (Join-Path $base ($importPath -replace '/', '\') "index.tsx").ToString(),
                (Join-Path $base ($importPath -replace '/', '\') "index.ts").ToString()
            )
            $found = $false
            foreach ($rp in $resolvedPaths) {
                if (Test-Path $rp) { $found = $true; break }
            }
            if (-not $found) {
                $lineNum = $i + 1
                Write-Host "BROKEN | File: $relFile | Line: $lineNum | Import: @/$importPath"
                $broken += "$relFile|$lineNum|$importPath"
            }
        }
    }
}

Write-Host ""
Write-Host "=== TOTAL BROKEN IMPORTS: $($broken.Count) ==="
Write-Host ""

# Now find orphan components - components not imported by any active file
Write-Host "=== ORPHAN COMPONENTS SCAN ==="

$componentFiles = Get-ChildItem -Path "components" -Recurse -Include "*.tsx","*.ts" | Where-Object { $_.FullName -notlike "*\components\ui\*" } | ForEach-Object {
    $_.FullName.Replace("$base\", "").Replace("\", "/")
}

# Build set of all import targets from active files
$importedPaths = @{}

foreach ($f in $activeFiles) {
    if (-not (Test-Path $f)) { continue }
    $lines = Get-Content $f -ErrorAction SilentlyContinue
    if ($null -eq $lines) { continue }
    foreach ($line in $lines) {
        if ($line -match 'from\s+[''"]@/([^''"]+)[''"]') {
            $imp = $Matches[1]
            $importedPaths[$imp] = $true
            # Also add with extensions
            $importedPaths["$imp.tsx"] = $true
            $importedPaths["$imp.ts"] = $true
        }
        # Also check relative imports
        if ($line -match 'from\s+[''"]\./([^''"]+)[''"]') {
            $relImp = $Matches[1]
            $importedPaths[$relImp] = $true
        }
    }
}

foreach ($cf in $componentFiles) {
    # Convert to import path format: components/foo.tsx -> components/foo
    $importFormat = $cf -replace '\.(tsx|ts)$', ''
    $importFormatFull = $cf
    
    $isImported = $false
    if ($importedPaths.ContainsKey($importFormat) -or $importedPaths.ContainsKey($importFormatFull)) {
        $isImported = $true
    }
    
    if (-not $isImported) {
        Write-Host "ORPHAN | $cf"
    }
}

Write-Host ""
Write-Host "=== SCAN COMPLETE ==="
