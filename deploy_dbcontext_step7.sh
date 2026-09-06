#!/usr/bin/env bash
# Small follow-up diagnostic: ApplicationDbContext.cs drifted from the
# hash Step 7 Phase A's deploy script was expecting. Confirm what
# actually changed before deciding whether it's safe to proceed.
set -uo pipefail

sec() { echo ""; echo "=== $* ==="; echo "=== $* ===" >&2; }

sec "1. Current blob hash + size"
f="backend/PPS.LicenseManager.API/Data/ApplicationDbContext.cs"
if [ ! -f "$f" ]; then
    echo "!!! NOT FOUND: $f"
else
    git hash-object "$f"
    wc -l "$f"
fi

sec "2. Full DbSet<> list (table/entity names, authoritative)"
grep -n "DbSet<" "$f"

sec "3. Confirm the specific DbSets Step 7 Phase A depends on are still present"
for entity in Asset AssetAssignment License LicensePurchase Company Department OfficeLocation Vendor Software; do
    grep -n "DbSet<${entity}>" "$f" || echo "!!! DbSet<${entity}> not found"
done

sec "4. git log - has this file changed recently, and by what"
git log -3 --oneline -- "$f" 2>&1

sec "5. Full base64 dump (for a byte-exact diff against what Step 7 Phase A was built against)"
if [ -f "$f" ]; then
    echo "=== FILE: $f ==="
    base64 -w0 "$f"
    echo ""
    echo "=== END FILE: $f ==="
fi

echo ""
echo ">>> DONE"
