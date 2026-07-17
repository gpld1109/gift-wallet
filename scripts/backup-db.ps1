# backup-db.ps1 — full backup of the Gift Wallet Supabase database.
#
# WHY THIS MATTERS: user_keys holds every user's *wrapped* encryption key. If that
# table is ever lost, no user can decrypt their cards again — not even with the
# correct passphrase. It is the one truly unrecoverable loss in this system, and
# Supabase's free plan takes no automatic backups. Hence this script.
#
# The connection string (which contains the database password) is read from
# db-url.txt next to the backups. It is deliberately OUTSIDE the git repo so it
# can never be committed.
#
# SETUP (once):
#   1. Supabase Dashboard → Project Settings → Database → Connection string → URI
#   2. Save it into  C:\gift-wallet-backups\db-url.txt
#
# RUN:  powershell -ExecutionPolicy Bypass -File C:\gift-wallet\scripts\backup-db.ps1

$ErrorActionPreference = "Stop"

$root    = "C:\gift-wallet-backups"
$urlFile = Join-Path $root "db-url.txt"

if (-not (Test-Path $root)) { New-Item -ItemType Directory -Force $root | Out-Null }

if (-not (Test-Path $urlFile)) {
  Write-Host "Missing $urlFile" -ForegroundColor Red
  Write-Host "Paste your Supabase connection string (Settings -> Database -> Connection string -> URI) into that file, then run again."
  exit 1
}

$dbUrl = (Get-Content -Raw -Encoding UTF8 $urlFile).Trim()
if (-not $dbUrl) { Write-Host "db-url.txt is empty." -ForegroundColor Red; exit 1 }

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
$out   = Join-Path $root $stamp
New-Item -ItemType Directory -Force $out | Out-Null

Write-Host "Backing up to $out ..." -ForegroundColor Cyan

# Three files, as Supabase documents: cluster roles, schema, then data.
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $out "roles.sql")  --role-only
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $out "schema.sql")
npx --yes supabase@latest db dump --db-url $dbUrl -f (Join-Path $out "data.sql")   --data-only --use-copy

# Fail loudly if a dump came back empty — a silent 0-byte "backup" is worse than none.
foreach ($f in @("roles.sql", "schema.sql", "data.sql")) {
  $p = Join-Path $out $f
  if (-not (Test-Path $p) -or (Get-Item $p).Length -eq 0) {
    Write-Host "BACKUP FAILED: $f is missing or empty." -ForegroundColor Red
    exit 1
  }
}

# Sanity check: the irreplaceable table must actually be in the dump.
if (-not (Select-String -Path (Join-Path $out "data.sql") -Pattern "user_keys" -Quiet)) {
  Write-Host "WARNING: user_keys not found in data.sql - check the dump!" -ForegroundColor Yellow
}

# Keep the 8 most recent backups.
Get-ChildItem $root -Directory | Sort-Object Name -Descending | Select-Object -Skip 8 | Remove-Item -Recurse -Force

$size = [math]::Round((Get-ChildItem $out | Measure-Object Length -Sum).Sum / 1KB)
Write-Host "Backup complete: $out ($size KB)" -ForegroundColor Green
Write-Host "Remember: copy it off this PC (cloud folder / external drive)." -ForegroundColor Yellow
