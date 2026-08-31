#!/usr/bin/env python3
"""Keep the left nav expanded: no desktop collapse rail.

Run from the PPP-License-Manager repo root after extracting the pack.
Overwrites sidebar layout primitives only. Does not change nav items or routes.
"""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path.cwd()
INDEX_CSS = ROOT / "frontend" / "index.css"
REQUIRED = [
    ROOT / "frontend" / "components" / "layout" / "app-sidebar.tsx",
    ROOT / "frontend" / "components" / "ui" / "sidebar.tsx",
]

SCROLL_CSS = """
/* Keep the sidebar nav scrollbar visible and stable instead of hover-only overlay. */
.sidebar-nav-scroll {
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: rgb(9 9 11 / 0.32) transparent;
}

.sidebar-nav-scroll::-webkit-scrollbar {
  width: 8px;
}

.sidebar-nav-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(9 9 11 / 0.32);
  border-radius: 9999px;
}

.dark .sidebar-nav-scroll {
  scrollbar-color: rgb(255 255 255 / 0.28) transparent;
}

.dark .sidebar-nav-scroll::-webkit-scrollbar-thumb {
  background-color: rgb(255 255 255 / 0.28);
}
"""


def main() -> int:
    missing = [path for path in REQUIRED if not path.exists()]
    if missing:
        print("missing files (extract the pack at the repo root first):", file=sys.stderr)
        for path in missing:
            print(f"  {path}", file=sys.stderr)
        return 1

    sidebar = REQUIRED[0].read_text()
    if "SidebarTrigger" in sidebar or "SidebarRail" in sidebar or 'collapsible="icon"' in sidebar:
        print("app-sidebar.tsx still has collapse controls", file=sys.stderr)
        return 1

    primitives = REQUIRED[1].read_text()
    if "Desktop nav stays expanded" not in primitives:
        print("sidebar.tsx is not the always-expanded pack", file=sys.stderr)
        return 1

    print(f"ok {REQUIRED[0]}")
    print(f"ok {REQUIRED[1]}")

    if not INDEX_CSS.exists():
        print(f"missing {INDEX_CSS}", file=sys.stderr)
        return 1

    css = INDEX_CSS.read_text()
    if ".sidebar-nav-scroll" in css:
        print(f"{INDEX_CSS} already has .sidebar-nav-scroll")
    else:
        INDEX_CSS.write_text(css.rstrip() + "\n" + SCROLL_CSS)
        print(f"appended scrollbar styles to {INDEX_CSS}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
