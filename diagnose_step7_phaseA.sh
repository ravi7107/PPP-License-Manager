#!/usr/bin/env bash
# Step 7 Phase A follow-up diagnostic — dumps the remaining Report Center
# files (catalog, controller, excel export service), the AssetAssignment
# model, and retries the DB schema query (docker's db service was reported
# not running last time this was attempted).
#
# Safety discipline (same as every prior diagnostic this engagement):
#   - set -uo pipefail, NOT -e, so one failing section doesn't kill the rest
#   - sec() echoes section headers to stdout AND stderr for live progress
#   - dump_file() checks [ -f "$f" ] before base64/hash, prints blob hash
#   - timeout + < /dev/null on every docker compose exec
#   - EXCLUDE_DIRS on any whole-tree grep

set -uo pipefail

EXCLUDE_DIRS=(--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build \
  --exclude-dir=.next --exclude-dir=coverage --exclude-dir=.git --exclude-dir=bin --exclude-dir=obj)

sec() { echo ""; echo "=== $* ==="; echo "=== $* ===" >&2; }

dump_file() {
  local f="$1"
  if [ ! -f "$f" ]; then
    echo "!!! NOT FOUND: $f"
    return
  fi
  echo "=== FILE: $f ==="
  echo "--- git blob hash ---"
  git hash-object "$f" 2>/dev/null || echo "(not in a git repo / hash failed)"
  echo "--- size ---"
  wc -c < "$f"
  echo "--- base64 ---"
  base64 -w0 "$f"
  echo ""
  echo "=== END FILE: $f ==="
}

sec "A1: locate repo root"
REPO_ROOT="$(pwd)"
echo "Assuming repo root = $REPO_ROOT (run this script from the repo root on the server)"
BACKEND="$REPO_ROOT/backend/PPS.LicenseManager.API"
echo "Backend path: $BACKEND"
ls -la "$BACKEND" 2>&1 | head -5

sec "A2: dump ReportCatalog.cs"
dump_file "$BACKEND/Services/ReportCenter/ReportCatalog.cs"

sec "A3: dump ReportCenterController.cs"
dump_file "$BACKEND/Controllers/ReportCenterController.cs"

sec "A4: dump ReportExcelExportService.cs"
dump_file "$BACKEND/Services/ReportCenter/ReportExcelExportService.cs"

sec "A5: dump IReportExcelExportService.cs (if present)"
IEXCEL="$(grep -rl "public interface IReportExcelExportService" "$BACKEND" $EXCLUDE_DIRS 2>/dev/null | head -1)"
if [ -n "${IEXCEL:-}" ]; then
  dump_file "$IEXCEL"
else
  echo "!!! IReportExcelExportService not found via grep (pattern: 'public interface IReportExcelExportService')"
fi

sec "A6: dump Models/AssetAssignment.cs"
dump_file "$BACKEND/Models/AssetAssignment.cs"

sec "A7: docker compose service status"
timeout 20 docker compose ps < /dev/null 2>&1

sec "A8: retry information_schema.columns for Step 7 Phase A tables"
timeout 20 docker compose exec -T db psql -U postgres -d ppslicensemanager -c \
  "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name IN ('Assets','AssetAssignments','Licenses','LicensePurchases') ORDER BY table_name, ordinal_position;" \
  < /dev/null 2>&1

sec "A9: retry \\dt (list all tables, confirm db reachable at all)"
timeout 20 docker compose exec -T db psql -U postgres -d ppslicensemanager -c "\dt" < /dev/null 2>&1

sec "A10: grep — how ReportCenterController enforces per-report permission overrides"
grep -n -A3 -B3 "Roles\|Authorize\|Permission" "$BACKEND/Controllers/ReportCenterController.cs" 2>/dev/null | head -100

echo ""
echo ">>> DONE"
