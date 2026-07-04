#!/bin/bash
# CI-friendly migration check — lists local migration files and fails
# if new migration files are found without a corresponding DB state annotation.
# This is a simpler (no-DB-access) variant that just ensures the migration
# directory isn't forgotten during a deploy.
#
# In CI, pair with a second step that runs check-migrations.ps1 against
# the staging/production Supabase instance.

MIGRATIONS_DIR="supabase/migrations"
ERRORS=0

echo "=== Migration files ==="
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "  $(basename "$f")"
done

echo ""
echo "Total: $(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | wc -l) migration files"
echo ""

# Convention: check that every file is listed in a .migrations-applied annotation.
# If no annotation file exists yet, just warn.
if [ -f .migrations-applied ]; then
  while IFS= read -r line; do
    # Remove leading/trailing whitespace and skip comments
    stripped=$(echo "$line" | xargs)
    case "$stripped" in
      \#*|"") continue ;;
    esac
    if [ ! -f "$MIGRATIONS_DIR/$stripped" ]; then
      echo "ERROR: Applied migration '$stripped' not found locally!" >&2
      ERRORS=$((ERRORS + 1))
    fi
  done < .migrations-applied

  for f in "$MIGRATIONS_DIR"/*.sql; do
    basename=$(basename "$f")
    if ! grep -qF "$basename" .migrations-applied 2>/dev/null; then
      echo "WARNING: '$basename' is not listed in .migrations-applied — was it applied?" >&2
      ERRORS=$((ERRORS + 1))
    fi
  done
else
  echo "NOTE: No .migrations-applied file found. Create one after applying migrations to the DB."
  echo "Each line should be a migration filename (e.g., 006_add_rejection_reason.sql)"
fi

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "FAILED: $ERRORR migration issue(s) found" >&2
  exit 1
fi

echo "All migration files accounted for."
