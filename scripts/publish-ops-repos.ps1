# Publish each apps/* portal as its own GitHub repository.
# Requires: GitHub CLI (`gh`) authenticated as CyberNinjaSaurav (or your org).
#
# Usage (PowerShell, from monorepo root):
#   .\scripts\publish-ops-repos.ps1
#
# Creates private repos and pushes an orphan branch containing only that app's files.

$ErrorActionPreference = "Stop"
$apps = @("doctor", "admin", "pharmacist", "delivery")
$owner = "CyberNinjaSaurav"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  Write-Host "GitHub CLI (gh) is not installed."
  Write-Host "Install: winget install --id GitHub.cli"
  Write-Host "Then: gh auth login"
  exit 1
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

foreach ($app in $apps) {
  $repo = "gwak-$app"
  $src = Join-Path $root "apps\$app"
  if (-not (Test-Path $src)) { throw "Missing $src — run node scripts/scaffold-ops-portals.mjs first" }

  Write-Host "`n=== Publishing $repo ===" -ForegroundColor Cyan
  $exists = gh repo view "$owner/$repo" 2>$null
  if (-not $?) {
    gh repo create "$owner/$repo" --private --description "GWAK $app portal (ops UI)" --confirm
  } else {
    Write-Host "Repo $owner/$repo already exists — will push"
  }

  $tmp = Join-Path $env:TEMP "gwak-publish-$app"
  if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
  New-Item -ItemType Directory -Path $tmp | Out-Null
  Copy-Item -Path (Join-Path $src "*") -Destination $tmp -Recurse
  @"
# Remote API

This portal expects \`gwak_api\` from https://github.com/$owner/medical-chatbot

Run API locally, then \`npm run dev\` in this repo.
"@ | Set-Content (Join-Path $tmp "API.md")

  Push-Location $tmp
  git init -b main
  git add -A
  git commit -m "Initial $repo portal scaffold"
  git remote add origin "https://github.com/$owner/$repo.git"
  git push -u origin main --force
  Pop-Location
  Write-Host "Published https://github.com/$owner/$repo"
}

Write-Host "`nAll portals published." -ForegroundColor Green
