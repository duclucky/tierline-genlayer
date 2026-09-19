$ErrorActionPreference = "Stop"
$env:PYTHONUTF8 = "1"

Write-Host "[1/3] genvm-lint"
& "$PSScriptRoot\..\.venv\Scripts\genvm-lint.exe" check "$PSScriptRoot\..\contracts\tierline.py"
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[2/3] direct tests"
& "$PSScriptRoot\..\.venv\Scripts\python.exe" -m pytest "$PSScriptRoot\..\tests\direct" -q
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "[3/3] frontend typecheck, tests, and production build"
& npm --prefix "$PSScriptRoot\..\frontend" run typecheck
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& npm --prefix "$PSScriptRoot\..\frontend" test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
& npm --prefix "$PSScriptRoot\..\frontend" run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "CHECK_PASS: genvm-lint, direct tests, frontend typecheck/tests/build"
