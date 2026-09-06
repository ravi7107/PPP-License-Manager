#!/usr/bin/env bash
# Follow-up diagnostic: 3 files the "License Purchases by Client" deploy
# script depends on have drifted from what was last verified. Dump their
# current content + recent history before deciding whether it's safe to
# proceed (same pattern as diagnose_dbcontext_drift.sh earlier this
# engagement).
set -uo pipefail

sec() { echo ""; echo "=== $* ==="; echo "=== $* ===" >&2; }

dump_file() {
    local f="$1"
    if [ ! -f "$f" ]; then
        echo "!!! NOT FOUND: $f"
        return
    fi
    echo "--- hash + lines: $f ---"
    git hash-object "$f"
    wc -l "$f"
    echo "--- git log -3: $f ---"
    git log -3 --oneline -- "$f" 2>&1
    echo "--- base64: $f ---"
    base64 -w0 "$f"
    echo ""
    echo "--- end: $f ---"
}

FILES=(
    "backend/PPS.LicenseManager.API/DTOs/ReportCenter/ReportQueryRequest.cs"
    "backend/PPS.LicenseManager.API/Services/ReportCenter/ReportExcelModels.cs"
    "backend/PPS.LicenseManager.API/Services/Interfaces/IReportExcelExportService.cs"
)

for f in "${FILES[@]}"; do
    sec "$f"
    dump_file "$f"
done

echo ""
echo ">>> DONE"
