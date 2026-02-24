$base = $PWD.Path
$importPaths = @{}
Get-ChildItem -Path "app","components","App.tsx","main.tsx" -Recurse -Include "*.tsx","*.ts" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike "*ARQUIVOS*" -and $_.FullName -notlike "*\components\ui\*" } | ForEach-Object { Select-String -Path $_.FullName -Pattern "from\s+[`"']@/([^`"']+)[`"']" -AllMatches | ForEach-Object { foreach ($m in $_.Matches) { $imp = $m.Groups[1].Value; if (-not $importPaths.ContainsKey($imp)) { $importPaths[$imp] = @() }; $relFile = $_.Path -replace [regex]::Escape($base + "\"), ""; $importPaths[$imp] += "${relFile}:$($_.LineNumber)" } } }
Write-Host "Unique imports: $($importPaths.Count)"
foreach ($imp in ($importPaths.Keys | Sort-Object)) { $pw = $imp -replace '/', '\'; $full = Join-Path $base $pw; $exists = (Test-Path "$full.tsx") -or (Test-Path "$full.ts"); if (-not $exists) { Write-Host "MISSING: @/$imp"; foreach ($ref in $importPaths[$imp]) { Write-Host "  <- $ref" } } }
Write-Host "=== DONE ==="
