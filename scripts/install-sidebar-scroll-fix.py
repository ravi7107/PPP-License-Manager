#!/usr/bin/env python3
"""Pin the left nav scroll region and keep its scrollbar visible.

Run from the PPP-License-Manager repo root (inventory: /home/PPP-License-Manager).
Does not replace app-sidebar.tsx or nav items.
"""

from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path.cwd()
SIDEBAR = ROOT / "frontend" / "components" / "ui" / "sidebar.tsx"
INDEX_CSS = ROOT / "frontend" / "index.css"

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

REPLACEMENTS = [
    (
        'className="flex h-full w-full flex-col">{children}</div>',
        'className="flex h-full min-h-0 w-full flex-col overflow-hidden">{children}</div>',
    ),
    (
        'className="flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"',
        'className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow"',
    ),
    (
        '`fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] ${SIDEBAR_TRANSITION} md:flex`',
        '`fixed inset-y-0 z-10 hidden h-svh min-h-0 w-[--sidebar-width] transition-[left,right,width] ${SIDEBAR_TRANSITION} md:flex md:flex-col`',
    ),
    (
        'className={cn("flex flex-col gap-1.5 p-2", className)}',
        'className={cn("flex shrink-0 flex-col gap-1.5 p-2", className)}',
    ),
    (
        'className={cn("flex flex-col gap-2 p-2", className)}',
        'className={cn("flex shrink-0 flex-col gap-2 border-t border-sidebar-border p-2", className)}',
    ),
    (
        '"flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden [scrollbar-width:thin] [scrollbar-color:transparent_transparent] hover:[scrollbar-color:hsl(var(--border))_transparent] group-data-[collapsible=icon]:overflow-y-auto"',
        '"sidebar-nav-scroll flex min-h-0 flex-1 flex-col gap-1 overflow-x-hidden overflow-y-auto overscroll-contain pb-1 [scrollbar-gutter:stable] [scrollbar-width:thin] [scrollbar-color:rgb(9_9_11_/_0.32)_transparent] group-data-[collapsible=icon]:overflow-y-auto"',
    ),
]


def main() -> int:
    if not SIDEBAR.exists():
        print(f"missing {SIDEBAR}", file=sys.stderr)
        return 1

    text = SIDEBAR.read_text()
    applied = 0
    skipped = 0
    for old, new in REPLACEMENTS:
        if new in text and old not in text:
            skipped += 1
            continue
        if old not in text:
            print(f"pattern not found:\n  {old[:120]}", file=sys.stderr)
            return 1
        text = text.replace(old, new, 1)
        applied += 1

    SIDEBAR.write_text(text)
    print(f"patched {SIDEBAR} ({applied} replacements, {skipped} already applied)")

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
