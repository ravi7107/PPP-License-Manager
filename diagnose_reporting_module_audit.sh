#!/usr/bin/env bash
# Read-only audit diagnostic for the existing Excel Reporting Module.
# Writes nothing, changes nothing - pure discovery + content dumps + live
# schema so the reporting-module audit is based on the actual application,
# not assumption. Deliberately does NOT use `set -e`, since grep/find
# returning "no match" (exit 1) is expected and must not abort the script.
#
# Run this FROM THE REPO ROOT (e.g. /home/PPP-License-Manager), redirect
# its output to a file, then transfer that file via MobaXterm's SFTP panel
# and upload it to chat - same pattern as every other diagnostic so far.
#
#   bash diagnose_reporting_module_audit.sh > /home/pps/reporting_audit_diag.txt
#
set -uo pipefail

sec() { echo ""; echo "##### $1 #####"; }

sec "GIT STATE"
git rev-parse HEAD 2>&1
git log --oneline -1 2>&1

# ---------------------------------------------------------------------
# A. FRONTEND — discovery
# ---------------------------------------------------------------------
sec "A1. frontend/app/pages top-level + depth-2 folders"
find frontend/app/pages -maxdepth 2 -type d 2>/dev/null | sort

sec "A2. Any frontend file with 'report' in its path (case-insensitive)"
find frontend -type f -ipath "*report*" 2>/dev/null | sort

sec "A3. app.tsx — every line mentioning 'report' (case-insensitive), with context"
grep -n -i -B2 -A2 "report" frontend/app/app.tsx 2>&1

sec "A4. nav-config.ts / roles.ts — already recovered earlier this session, skipped here"

sec "A5. frontend/lib/api files mentioning Report (content grep)"
grep -rl -i "report" frontend/lib/api/ 2>/dev/null | sort

sec "A6. frontend/lib/utils files mentioning report/export"
find frontend/lib/utils -type f -iname "*report*" -o -iname "*export*" 2>/dev/null | sort

echo ""
echo "--- Full content (base64) of every frontend file found in A2 ---"
for f in $(find frontend -type f -ipath "*report*" 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  echo "--- blob hash ---"
  git rev-parse "HEAD:$f" 2>&1
  echo "--- base64 ---"
  base64 -w0 "$f" 2>&1
  echo ""
done

echo ""
echo "--- Full content (base64) of frontend/lib/utils/report-export.ts (if present) ---"
if [ -f frontend/lib/utils/report-export.ts ]; then
  echo "=== FILE: frontend/lib/utils/report-export.ts ==="
  git rev-parse "HEAD:frontend/lib/utils/report-export.ts" 2>&1
  base64 -w0 frontend/lib/utils/report-export.ts
  echo ""
else
  echo "(not found at that exact path)"
fi

# ---------------------------------------------------------------------
# B. BACKEND — discovery
# ---------------------------------------------------------------------
sec "B1. Backend Controllers mentioning Report"
grep -rl "Report" backend/PPS.LicenseManager.API/Controllers/*.cs 2>/dev/null | sort

sec "B2. Backend Services mentioning Report"
grep -rl "Report" backend/PPS.LicenseManager.API/Services/*.cs 2>/dev/null | sort

sec "B3. Backend DTO files with 'Report' in filename"
find backend/PPS.LicenseManager.API/DTOs -iname "*Report*" 2>/dev/null | sort

sec "B4. Backend Model files with 'Report' in filename (e.g. SavedReport, ReportHistory)"
find backend/PPS.LicenseManager.API/Models -iname "*Report*" 2>/dev/null | sort

sec "B5. Migrations mentioning Report/SavedReport/ReportHistory"
grep -rl "Report" backend/PPS.LicenseManager.API/Migrations/*.cs 2>/dev/null | sort

sec "B6. ApplicationDbContext.cs — every DbSet line (full list of live entities)"
grep -n "DbSet<" backend/PPS.LicenseManager.API/Data/ApplicationDbContext.cs 2>&1

echo ""
echo "--- For every Controller file found in B1: full content (base64) ---"
for f in $(grep -rl "Report" backend/PPS.LicenseManager.API/Controllers/*.cs 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  git rev-parse "HEAD:$f" 2>&1
  base64 -w0 "$f"
  echo ""
done

echo ""
echo "--- For every Service file found in B2: targeted excerpt around each"
echo "    method whose name contains 'Report' (signature + up to 140 lines) ---"
for f in $(grep -rl "Report" backend/PPS.LicenseManager.API/Services/*.cs 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  grep -n -B2 -A140 "public.*Task.*Report" "$f" 2>&1
  echo "--- (also: any other line mentioning Report, for anything the pattern above missed) ---"
  grep -n -i "report" "$f" 2>&1
done

echo ""
echo "--- Full content (base64) of every DTO file found in B3 ---"
for f in $(find backend/PPS.LicenseManager.API/DTOs -iname "*Report*" 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  git rev-parse "HEAD:$f" 2>&1
  base64 -w0 "$f"
  echo ""
done

echo ""
echo "--- Full content (base64) of every Model file found in B4 ---"
for f in $(find backend/PPS.LicenseManager.API/Models -iname "*Report*" 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  git rev-parse "HEAD:$f" 2>&1
  base64 -w0 "$f"
  echo ""
done

echo ""
echo "--- Full content (base64) of every Migration file found in B5 ---"
for f in $(grep -rl "Report" backend/PPS.LicenseManager.API/Migrations/*.cs 2>/dev/null | sort); do
  echo ""
  echo "=== FILE: $f ==="
  git rev-parse "HEAD:$f" 2>&1
  base64 -w0 "$f"
  echo ""
done

sec "B7. AnalyticsController.cs / AnalyticsService.cs (executive dashboard) - existence + size"
find backend/PPS.LicenseManager.API -iname "AnalyticsController.cs" -o -iname "AnalyticsService.cs" 2>/dev/null
wc -l backend/PPS.LicenseManager.API/Controllers/AnalyticsController.cs 2>&1
wc -l backend/PPS.LicenseManager.API/Services/AnalyticsService.cs 2>&1

sec "B8. PurchaseRequisitionService.cs — GetFulfillmentReportAsync / GetAvailableLinesForLinkingAsync excerpt"
grep -n -B2 -A160 "GetFulfillmentReportAsync" backend/PPS.LicenseManager.API/Services/PurchaseRequisitionService.cs 2>&1

# ---------------------------------------------------------------------
# C. Legacy shim / terminology checks
# ---------------------------------------------------------------------
sec "C1. 'UI Bakery' / uibakery / Bakery references anywhere"
grep -rn -i "bakery" frontend/ backend/ 2>/dev/null | head -80

sec "C2. RGP / NRGP / 'returnable' terminology anywhere"
grep -rn -iE "\bRGP\b|\bNRGP\b|returnable" frontend/ backend/ 2>/dev/null | head -80

sec "C3. 'Project' entity/field references anywhere (frontend+backend)"
grep -rn -iE "\bprojectid\b|\bproject_id\b" frontend/ backend/ 2>/dev/null | head -40

sec "C4. Asset hardware-spec fields (Processor/RAM/Storage/GPU/OS) - do they exist on the model?"
grep -n -iE "Processor|RamGb|Ram |Storage|Gpu|OperatingSystem|\\bOS\\b" backend/PPS.LicenseManager.API/Models/Asset.cs 2>&1

sec "C5. Asset.cs full field list (property declarations only)"
grep -n "public .*{ get; set; }" backend/PPS.LicenseManager.API/Models/Asset.cs 2>&1

# ---------------------------------------------------------------------
# D. LIVE DB SCHEMA
# ---------------------------------------------------------------------
sec "D1. All live tables"
docker compose exec -T postgres psql -U pps_admin -d pps_license_manager -c "\dt" 2>&1

sec "D2. Column-level schema for every reporting-relevant table"
docker compose exec -T postgres psql -U pps_admin -d pps_license_manager -c "
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name IN (
  'Assets','LicensePurchases','MaterialMovements','MaterialMovementItems',
  'MaterialMovementDispatches','MaterialMovementReceipts','MaterialMovementReceiptItems',
  'MaterialMovementReturns','PurchaseRequisitions','PurchaseRequisitionLineItems',
  'PurchaseRequisitionInvoices','PurchaseRequisitionPoUploads','Vendors','Companies',
  'Departments','OfficeLocations','ResourceAllocations','InventoryItems','InventoryCategories',
  'Users','Clients','AssetAssignments','AssetSoftwares','MaterialApprovalWorkflows',
  'SavedReports','ReportHistories','ReportHistory'
)
ORDER BY table_name, ordinal_position;
" 2>&1

echo ""
echo "=== END ==="
