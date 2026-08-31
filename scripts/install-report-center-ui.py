#!/usr/bin/env python3
"""Patch inventory nav/roles/routing for Report Center. Run from repo root."""

from __future__ import annotations

import re
from pathlib import Path

NAV = Path("frontend/lib/nav-config.ts")
ROLES = Path("frontend/lib/auth/roles.ts")
APP = Path("frontend/app/app.tsx")


def patch_roles(text: str) -> str:
    if "'savedReports'" not in text:
        text = text.replace(
            "  | 'accessManagement';",
            "  | 'accessManagement'\n  | 'savedReports'\n  | 'reportHistory';",
        )
        if "'savedReports'" not in text:
            text = text.replace(
                "  | 'accessManagement'",
                "  | 'accessManagement'\n  | 'savedReports'\n  | 'reportHistory'",
                1,
            )

    block = """  savedReports: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
  ],

  reportHistory: [
    'Super Admin',
    'IT Admin',
    'Team Lead',
    'Manager',
  ],
"""
    if "savedReports:" not in text:
        text = re.sub(
            r"(accessManagement:\s*\[[^\]]+\],)",
            rf"\1\n\n{block}",
            text,
            count=1,
            flags=re.S,
        )

    reports = re.search(r"reports:\s*\[([^\]]*?)\]", text, re.S)
    if reports and "'Team Lead'" not in reports.group(1):
        body = reports.group(1).rstrip()
        if body.strip() and not body.rstrip().endswith(","):
            body += ","
        text = (
            text[: reports.start(1)]
            + body
            + "\n    'Team Lead',\n  "
            + text[reports.end(1) :]
        )

    return text


def patch_nav(text: str) -> str:
    if "Bookmark" not in text or "History" not in text:
        text = re.sub(
            r"\s*} from 'lucide-react';",
            ", Bookmark, History } from 'lucide-react';",
            text,
            count=1,
        )

    text = re.sub(
        r"\{ key: 'reports', label: '[^']+', path: '[^']+', icon: [^}]+\}",
        "{ key: 'reports', label: 'Report Center', path: '/report-center', icon: BarChart3 }",
        text,
        count=1,
    )

    if "key: 'savedReports'" not in text:
        text = text.replace(
            "{ key: 'reports', label: 'Report Center', path: '/report-center', icon: BarChart3 },",
            "{ key: 'reports', label: 'Report Center', path: '/report-center', icon: BarChart3 },\n"
            "  { key: 'savedReports', label: 'Saved Reports', path: '/saved-reports', icon: Bookmark },\n"
            "  { key: 'reportHistory', label: 'Report History', path: '/report-history', icon: History },",
        )

    if "label: 'Reporting'" not in text and "NAV_GROUPS" in text:

        def inject_reporting(match: re.Match[str]) -> str:
            keys = re.sub(r",?\s*'reports'\s*", "", match.group(1))
            keys = re.sub(r",\s*,", ",", keys).strip().strip(",")
            return (
                "{ label: 'Reporting', keys: ['reports', 'savedReports', 'reportHistory'] },\n  "
                f"{{ label: 'Tools', keys: [{keys}] }}"
            )

        text, count = re.subn(
            r"\{ label: 'Tools', keys: \[([^\]]*)\]\s*\}",
            inject_reporting,
            text,
            count=1,
        )
        if count == 0:
            raise SystemExit("Could not find Tools group to insert Reporting.")

    return text


def patch_app(text: str) -> str:
    if "ReportCenterPage" not in text:
        if "import ReportsPage from '@/app/pages/reports/reports-page';" in text:
            text = text.replace(
                "import ReportsPage from '@/app/pages/reports/reports-page';",
                "import ReportsPage from '@/app/pages/reports/reports-page';\n"
                "import ReportCenterPage from '@/app/pages/reports/report-center-page';\n"
                "import ReportRunPage from '@/app/pages/reports/report-run-page';\n"
                "import SavedReportsPage from '@/app/pages/reports/saved-reports-page';\n"
                "import ReportHistoryPage from '@/app/pages/reports/report-history-page';",
            )
        else:
            text = text.replace(
                "import LoginPage from '@/app/pages/login/login-page';",
                "import LoginPage from '@/app/pages/login/login-page';\n"
                "import ReportCenterPage from '@/app/pages/reports/report-center-page';\n"
                "import ReportRunPage from '@/app/pages/reports/report-run-page';\n"
                "import SavedReportsPage from '@/app/pages/reports/saved-reports-page';\n"
                "import ReportHistoryPage from '@/app/pages/reports/report-history-page';",
            )

        text = re.sub(
            r"import \{ BrowserRouter, Routes, Route \} from 'react-router-dom'",
            "import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'",
            text,
        )

    if 'path="report-center"' not in text and "path='report-center'" not in text:
        insertion = """          <Route path="report-center" element={<ReportCenterPage />} />
          <Route path="report-center/:reportId" element={<ReportRunPage />} />
          <Route path="saved-reports" element={<SavedReportsPage />} />
          <Route path="report-history" element={<ReportHistoryPage />} />
"""
        if '<Route path="reports" element={<ReportsPage />} />' in text:
            text = text.replace(
                '<Route path="reports" element={<ReportsPage />} />',
                '<Route path="reports" element={<Navigate to="/report-center" replace />} />\n'
                + insertion,
                1,
            )
        else:
            text = text.replace(
                '<Route path="users"',
                insertion + '          <Route path="users"',
                1,
            )
    return text


def main() -> None:
    for path, patch in ((ROLES, patch_roles), (NAV, patch_nav), (APP, patch_app)):
        if not path.exists():
            raise SystemExit(f"Missing {path}")
        original = path.read_text()
        updated = patch(original)
        path.write_text(updated)
        print(f"updated {path} ({'changed' if updated != original else 'no change'})")


if __name__ == "__main__":
    main()
