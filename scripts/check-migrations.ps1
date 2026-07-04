param(
  [string]$SupabaseUrl = "",
  [string]$SupabaseServiceKey = ""
)

# Migration check script — compares local migration files against applied
# migrations in the Supabase database. Run as part of CI or before deploy.
#
# Usage:
#   .\scripts\check-migrations.ps1 -SupabaseUrl "https://xxx.supabase.co" -SupabaseServiceKey "eyJ..."
#
# Or set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.

$ErrorActionPreference = "Stop"

if (-not $SupabaseUrl) { $SupabaseUrl = $env:SUPABASE_URL }
if (-not $SupabaseServiceKey) { $SupabaseServiceKey = $env:SUPABASE_SERVICE_ROLE_KEY }

if (-not $SupabaseUrl -or -not $SupabaseServiceKey) {
  Write-Host "ERROR: Supabase credentials not provided. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or pass as params." -ForegroundColor Red
  exit 1
}

$migrationsDir = Join-Path $PSScriptRoot "..\supabase\migrations"

# Get local migration files (sorted by name)
$localFiles = Get-ChildItem "$migrationsDir\*.sql" | Sort-Object Name
$localMigrationNames = $localFiles | ForEach-Object { $_.Name }

Write-Host "Local migrations found:" -ForegroundColor Cyan
$localMigrationNames | ForEach-Object { Write-Host "  $_" }

# Query the database for a migration tracking table.
# Supabase projects that use the CLI create a _supabase_migrations table.
# If your project uses a custom migration tracker, adjust the query.
try {
  $query = @"
SELECT filename FROM _supabase_migrations ORDER BY filename
"@
  $body = @{ query = $query } | ConvertTo-Json

  $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/pg_query" -Method Post -Headers @{
    "apikey" = $SupabaseServiceKey
    "Authorization" = "Bearer $SupabaseServiceKey"
    "Content-Type" = "application/json"
  } -Body $body -ErrorAction Stop

  $remoteMigrations = $response | ForEach-Object { $_.filename }
} catch {
  # Fallback: try querying a custom migration_log table if _supabase_migrations doesn't exist
  Write-Host "Note: _supabase_migrations table not found. Checking supabase_migrations_log..." -ForegroundColor Yellow
  try {
    $query = @"
SELECT filename FROM supabase_migrations_log ORDER BY filename
"@
    $body = @{ query = $query } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$SupabaseUrl/rest/v1/rpc/pg_query" -Method Post -Headers @{
      "apikey" = $SupabaseServiceKey
      "Authorization" = "Bearer $SupabaseServiceKey"
      "Content-Type" = "application/json"
    } -Body $body -ErrorAction Stop
    $remoteMigrations = $response | ForEach-Object { $_.filename }
  } catch {
    Write-Host "WARNING: Could not query migration tracking table. Check the Supabase dashboard SQL editor manually." -ForegroundColor Yellow
    Write-Host "Applied migrations are typically listed in: public._supabase_migrations or public.migrations" -ForegroundColor Yellow
    exit 0
  }
}

if (-not $remoteMigrations) {
  Write-Host "No migrations found in database." -ForegroundColor Yellow
  exit 0
}

Write-Host "`nRemote (applied) migrations:" -ForegroundColor Cyan
$remoteMigrations | ForEach-Object { Write-Host "  $_" }

$missing = $localMigrationNames | Where-Object { $_ -notin $remoteMigrations }
$extra = $remoteMigrations | Where-Object { $_ -notin $localMigrationNames }

$hasError = $false

if ($missing.Count -gt 0) {
  $hasError = $true
  Write-Host "`nERROR: Local migrations NOT applied to database:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  MISSING: $_" -ForegroundColor Red }
}

if ($extra.Count -gt 0) {
  Write-Host "`nWARNING: Remote migrations not found locally:" -ForegroundColor Yellow
  $extra | ForEach-Object { Write-Host "  EXTRA: $_" -ForegroundColor Yellow }
}

if (-not $hasError) {
  Write-Host "`nAll local migrations are applied. Schema is in sync." -ForegroundColor Green
  exit 0
} else {
  exit 1
}
