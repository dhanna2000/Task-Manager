# Run from this folder: powershell -ExecutionPolicy Bypass -File .\setup-github.ps1
# Works with a brand-new empty GitHub repo (no README/license on GitHub).
# Requires Git + GitHub auth (HTTPS uses a Personal Access Token as the password).

Set-Location $PSScriptRoot
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-Host "Install Git from https://git-scm.com/download/win then reopen the terminal." -ForegroundColor Red
  exit 1
}

git init
git add .
if (git ls-files .env 2>$null) {
  Write-Host "ERROR: .env would be committed. It must stay in .gitignore — aborting." -ForegroundColor Red
  exit 1
}

git commit -m "first commit"
git branch -M main
git remote remove origin 2>$null
git remote add origin https://github.com/dhanna2000/Task-Manager.git
Write-Host "Pushing to GitHub..." -ForegroundColor Cyan
git push -u origin main
