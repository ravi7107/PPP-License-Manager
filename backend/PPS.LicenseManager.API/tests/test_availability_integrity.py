#!/usr/bin/env python3

import subprocess
import sys
from datetime import datetime

DB_NAME = "pps_license_manager"

passed = 0
failed = 0
warnings = 0


def query(sql):
    cmd = [
        "sudo", "-u", "postgres",
        "psql",
        "-d", DB_NAME,
        "-t",
        "-A",
        "-F", "|",
        "-c", sql,
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print(result.stderr)
        raise RuntimeError("PostgreSQL query failed.")

    return [
        line.strip()
        for line in result.stdout.splitlines()
        if line.strip()
    ]


def pass_test(name, detail=""):
    global passed
    passed += 1
    print(f"[PASS] {name}")
    if detail:
        print(f"       {detail}")


def fail_test(name, detail=""):
    global failed
    failed += 1
    print(f"[FAIL] {name}")
    if detail:
        print(f"       {detail}")


def warn_test(name, detail=""):
    global warnings
    warnings += 1
    print(f"[WARN] {name}")
    if detail:
        print(f"       {detail}")


def expect_zero(name, sql):
    rows = query(sql)

    if not rows:
        pass_test(name)
    else:
        fail_test(
            name,
            f"{len(rows)} problematic row(s):"
        )
        for row in rows[:10]:
            print(f"       {row}")


print()
print("=" * 68)
print(" PPS LICENSE MANAGER")
print(" AVAILABILITY / REALLOCATION INTEGRITY TEST")
print("=" * 68)
print(f" Database : {DB_NAME}")
print(f" Started  : {datetime.now()}")
print(" Mode     : READ ONLY")
print("=" * 68)
print()


# ---------------------------------------------------------
# TEST 1
# More than one active allocation for a license
# ---------------------------------------------------------

expect_zero(
    "No license has multiple active allocations",
    '''
    SELECT
        "LicenseId",
        COUNT(*)
    FROM "ResourceAllocations"
    WHERE "IsActive" = TRUE
    GROUP BY "LicenseId"
    HAVING COUNT(*) > 1;
    '''
)


# ---------------------------------------------------------
# TEST 2
# Active allocation must have Allocated status
# ---------------------------------------------------------

expect_zero(
    "Active allocations use Allocated status",
    '''
    SELECT
        "Id",
        "LicenseId",
        "Status"
    FROM "ResourceAllocations"
    WHERE "IsActive" = TRUE
      AND "Status" <> 'Allocated';
    '''
)


# ---------------------------------------------------------
# TEST 3
# Transferred/released allocation should not remain active
# ---------------------------------------------------------

expect_zero(
    "Transferred or Released allocations are inactive",
    '''
    SELECT
        "Id",
        "LicenseId",
        "Status",
        "IsActive"
    FROM "ResourceAllocations"
    WHERE "Status" IN ('Transferred', 'Released')
      AND "IsActive" = TRUE;
    '''
)


# ---------------------------------------------------------
# TEST 4
# Approved request requires resulting allocation
# ---------------------------------------------------------

expect_zero(
    "Approved requests have resulting allocations",
    '''
    SELECT
        "Id",
        "Status",
        "ResultingAllocationId"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Approved'
      AND "ResultingAllocationId" IS NULL;
    '''
)


# ---------------------------------------------------------
# TEST 5
# Returned request requires full lifecycle metadata
# ---------------------------------------------------------

expect_zero(
    "Returned requests contain complete return metadata",
    '''
    SELECT
        "Id",
        "ReturnAllocationId",
        "ReturnedAt",
        "ReturnedByUserId"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Returned'
      AND (
          "ReturnAllocationId" IS NULL
          OR "ReturnedAt" IS NULL
          OR "ReturnedByUserId" IS NULL
      );
    '''
)


# ---------------------------------------------------------
# TEST 6
# Returned request requires resulting allocation
# ---------------------------------------------------------

expect_zero(
    "Returned requests have temporary resulting allocation",
    '''
    SELECT
        "Id",
        "ResultingAllocationId"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Returned'
      AND "ResultingAllocationId" IS NULL;
    '''
)


# ---------------------------------------------------------
# TEST 7
# Returned temporary allocation must be inactive
# ---------------------------------------------------------

expect_zero(
    "Returned temporary allocations are inactive",
    '''
    SELECT
        rr."Id",
        rr."ResultingAllocationId",
        ra."IsActive",
        ra."Status"
    FROM "ResourceReallocationRequests" rr
    JOIN "ResourceAllocations" ra
      ON ra."Id" = rr."ResultingAllocationId"
    WHERE rr."Status" = 'Returned'
      AND ra."IsActive" = TRUE;
    '''
)


# ---------------------------------------------------------
# TEST 8
# Return allocation must be active
# ---------------------------------------------------------

expect_zero(
    "Return allocations are active",
    '''
    SELECT
        rr."Id",
        rr."ReturnAllocationId",
        ra."IsActive",
        ra."Status"
    FROM "ResourceReallocationRequests" rr
    JOIN "ResourceAllocations" ra
      ON ra."Id" = rr."ReturnAllocationId"
    WHERE rr."Status" = 'Returned'
      AND (
          ra."IsActive" = FALSE
          OR ra."Status" <> 'Allocated'
      );
    '''
)


# ---------------------------------------------------------
# TEST 9
# Return allocation must belong to original user
# ---------------------------------------------------------

expect_zero(
    "Returned licenses are restored to original user",
    '''
    SELECT
        rr."Id",
        original."UserId" AS original_user,
        returned."UserId" AS returned_user
    FROM "ResourceReallocationRequests" rr

    JOIN "ResourceAllocations" original
      ON original."Id" = rr."ResourceAllocationId"

    JOIN "ResourceAllocations" returned
      ON returned."Id" = rr."ReturnAllocationId"

    WHERE rr."Status" = 'Returned'
      AND original."UserId" <> returned."UserId";
    '''
)


# ---------------------------------------------------------
# TEST 10
# Temporary allocation belongs to requested target
# ---------------------------------------------------------

expect_zero(
    "Temporary allocations belong to requested target user",
    '''
    SELECT
        rr."Id",
        rr."TargetUserId",
        temp."UserId"
    FROM "ResourceReallocationRequests" rr

    JOIN "ResourceAllocations" temp
      ON temp."Id" = rr."ResultingAllocationId"

    WHERE rr."Status" IN ('Approved', 'Returned')
      AND temp."UserId" <> rr."TargetUserId";
    '''
)


# ---------------------------------------------------------
# TEST 11
# Original/result/return allocations must use same license
# ---------------------------------------------------------

expect_zero(
    "Reallocation lifecycle keeps the same license",
    '''
    SELECT
        rr."Id",
        original."LicenseId",
        temp."LicenseId",
        returned."LicenseId"
    FROM "ResourceReallocationRequests" rr

    JOIN "ResourceAllocations" original
      ON original."Id" = rr."ResourceAllocationId"

    LEFT JOIN "ResourceAllocations" temp
      ON temp."Id" = rr."ResultingAllocationId"

    LEFT JOIN "ResourceAllocations" returned
      ON returned."Id" = rr."ReturnAllocationId"

    WHERE
        (
            temp."Id" IS NOT NULL
            AND temp."LicenseId" <> original."LicenseId"
        )
        OR
        (
            returned."Id" IS NOT NULL
            AND returned."LicenseId" <> original."LicenseId"
        );
    '''
)


# ---------------------------------------------------------
# TEST 12
# Rejected request must not have resulting allocation
# ---------------------------------------------------------

expect_zero(
    "Rejected requests did not create allocations",
    '''
    SELECT
        "Id",
        "ResultingAllocationId"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Rejected'
      AND "ResultingAllocationId" IS NOT NULL;
    '''
)


# ---------------------------------------------------------
# TEST 13
# Pending request should not have decision metadata
# ---------------------------------------------------------

expect_zero(
    "Pending requests have no decision metadata",
    '''
    SELECT
        "Id",
        "DecidedAt",
        "DecidedByUserId"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Pending'
      AND (
          "DecidedAt" IS NOT NULL
          OR "DecidedByUserId" IS NOT NULL
      );
    '''
)


# ---------------------------------------------------------
# TEST 14
# Returned timestamp should follow decision timestamp
# ---------------------------------------------------------

expect_zero(
    "Return timestamp occurs after approval",
    '''
    SELECT
        "Id",
        "DecidedAt",
        "ReturnedAt"
    FROM "ResourceReallocationRequests"
    WHERE "Status" = 'Returned'
      AND (
          "DecidedAt" IS NULL
          OR "ReturnedAt" IS NULL
          OR "ReturnedAt" < "DecidedAt"
      );
    '''
)


# ---------------------------------------------------------
# TEST 15
# Result allocation should occur after original allocation
# ---------------------------------------------------------

expect_zero(
    "Temporary allocation chronology is valid",
    '''
    SELECT
        rr."Id",
        original."AllocatedOn",
        temp."AllocatedOn"
    FROM "ResourceReallocationRequests" rr

    JOIN "ResourceAllocations" original
      ON original."Id" = rr."ResourceAllocationId"

    JOIN "ResourceAllocations" temp
      ON temp."Id" = rr."ResultingAllocationId"

    WHERE temp."AllocatedOn" < original."AllocatedOn";
    '''
)


# ---------------------------------------------------------
# TEST 16
# Return allocation should occur after temporary allocation
# ---------------------------------------------------------

expect_zero(
    "Return allocation chronology is valid",
    '''
    SELECT
        rr."Id",
        temp."AllocatedOn",
        returned."AllocatedOn"
    FROM "ResourceReallocationRequests" rr

    JOIN "ResourceAllocations" temp
      ON temp."Id" = rr."ResultingAllocationId"

    JOIN "ResourceAllocations" returned
      ON returned."Id" = rr."ReturnAllocationId"

    WHERE returned."AllocatedOn" < temp."AllocatedOn";
    '''
)


# ---------------------------------------------------------
# TEST 17
# Cancelled periods should contain cancellation metadata
# ---------------------------------------------------------

expect_zero(
    "Cancelled unavailability contains cancellation metadata",
    '''
    SELECT
        "Id",
        "CancelledAt",
        "CancelledByUserId"
    FROM "UserUnavailabilities"
    WHERE "Status" = 'Cancelled'
      AND (
          "CancelledAt" IS NULL
          OR "CancelledByUserId" IS NULL
      );
    '''
)


# ---------------------------------------------------------
# TEST 18
# Active periods should not contain cancellation metadata
# ---------------------------------------------------------

expect_zero(
    "Active unavailability has no cancellation metadata",
    '''
    SELECT
        "Id",
        "CancelledAt",
        "CancelledByUserId"
    FROM "UserUnavailabilities"
    WHERE "Status" = 'Active'
      AND (
          "CancelledAt" IS NOT NULL
          OR "CancelledByUserId" IS NOT NULL
      );
    '''
)


# ---------------------------------------------------------
# TEST 19
# Invalid unavailability date ranges
# ---------------------------------------------------------

expect_zero(
    "Unavailability date ranges are valid",
    '''
    SELECT
        "Id",
        "StartDate",
        "EndDate"
    FROM "UserUnavailabilities"
    WHERE "EndDate" < "StartDate";
    '''
)


# ---------------------------------------------------------
# TEST 20
# Active allocations reference active licenses
# ---------------------------------------------------------

expect_zero(
    "Active allocations reference active licenses",
    '''
    SELECT
        ra."Id",
        ra."LicenseId",
        l."AliasCode"
    FROM "ResourceAllocations" ra

    JOIN "Licenses" l
      ON l."Id" = ra."LicenseId"

    WHERE ra."IsActive" = TRUE
      AND l."IsActive" = FALSE;
    '''
)


# ---------------------------------------------------------
# Informational counts
# ---------------------------------------------------------

print()
print("-" * 68)
print(" DATABASE SUMMARY")
print("-" * 68)

summary_queries = {
    "Active allocations":
        'SELECT COUNT(*) FROM "ResourceAllocations" WHERE "IsActive" = TRUE;',

    "Pending requests":
        '''SELECT COUNT(*) FROM "ResourceReallocationRequests"
           WHERE "Status" = 'Pending';''',

    "Approved requests":
        '''SELECT COUNT(*) FROM "ResourceReallocationRequests"
           WHERE "Status" = 'Approved';''',

    "Returned requests":
        '''SELECT COUNT(*) FROM "ResourceReallocationRequests"
           WHERE "Status" = 'Returned';''',

    "Rejected requests":
        '''SELECT COUNT(*) FROM "ResourceReallocationRequests"
           WHERE "Status" = 'Rejected';''',

    "Active unavailability":
        '''SELECT COUNT(*) FROM "UserUnavailabilities"
           WHERE "Status" = 'Active';''',
}

for label, sql in summary_queries.items():
    rows = query(sql)
    value = rows[0] if rows else "0"
    print(f" {label:<28} {value}")


# ---------------------------------------------------------
# Final result
# ---------------------------------------------------------

total = passed + failed

print()
print("=" * 68)
print(" TEST RESULT")
print("=" * 68)
print(f" Total tests : {total}")
print(f" Passed      : {passed}")
print(f" Failed      : {failed}")
print(f" Warnings    : {warnings}")

if failed == 0:
    print()
    print(" RESULT: ALL INTEGRITY TESTS PASSED")
    print("=" * 68)
    sys.exit(0)
else:
    print()
    print(" RESULT: INTEGRITY PROBLEMS DETECTED")
    print("=" * 68)
    sys.exit(1)
