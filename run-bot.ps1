# Quest Board bot — run from project folder (double-click or: powershell -ExecutionPolicy Bypass -File .\run-bot.ps1)
# Fixes: Cursor/IDE terminals where npm isn't on PATH, and reminds you not to paste bot *output* as commands.

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

# Refresh PATH (helps terminals that didn't inherit a full user PATH)
$machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if ($machinePath -or $userPath) {
  $env:Path = "$machinePath;$userPath"
}

$npmCandidates = @(
  'npm',
  (Join-Path $env:ProgramFiles 'nodejs\npm.cmd'),
  (Join-Path ${env:ProgramFiles(x86)} 'nodejs\npm.cmd'),
  (Join-Path $env:LOCALAPPDATA 'Programs\nodejs\npm.cmd')
)

$npmExe = $null
foreach ($c in $npmCandidates) {
  if ($c -eq 'npm') {
    $cmd = Get-Command npm -ErrorAction SilentlyContinue
    if ($cmd) { $npmExe = $cmd.Source; break }
  }
  elseif (Test-Path -LiteralPath $c) {
    $npmExe = $c
    break
  }
}

if (-not $npmExe) {
  Write-Host ''
  Write-Host '=== npm was not found ===' -ForegroundColor Yellow
  Write-Host '1. Install Node.js LTS: https://nodejs.org (enable "Add to PATH").'
  Write-Host '2. Quit Cursor completely and reopen, then run this script again.'
  Write-Host ''
  Write-Host 'Tip: Lines like "Logged in as YourBot" are bot OUTPUT — do not paste them into PowerShell.' -ForegroundColor DarkGray
  Write-Host ''
  exit 1
}

Write-Host "Using npm at: $npmExe" -ForegroundColor Green
Write-Host ''

& $npmExe install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

& $npmExe run deploy-commands
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ''
Write-Host 'Starting bot (Ctrl+C to stop)...' -ForegroundColor Cyan
& $npmExe start
