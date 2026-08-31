#!/usr/bin/env python3
"""Install Report Center backend files and register services in Program.cs."""

from __future__ import annotations

import shutil
from pathlib import Path

ROOT = Path("backend/PPS.LicenseManager.API")
HERE = Path(__file__).resolve().parent.parent / "deploy" / "report-center-backend"

FILES = [
    "Controllers/ReportCenterController.cs",
    "DTOs/ReportCenter/AppliedFilterEntry.cs",
    "DTOs/ReportCenter/ReportCatalogEntryResponse.cs",
    "DTOs/ReportCenter/ReportFilterFieldResponse.cs",
    "DTOs/ReportCenter/ReportPreviewEnvelope.cs",
    "DTOs/ReportCenter/ReportQueryRequest.cs",
    "DTOs/ReportCenter/Rows/AssetRegisterRow.cs",
    "DTOs/ReportCenter/Rows/ClientCostSummaryRow.cs",
    "DTOs/ReportCenter/Rows/ClientLicenseRegisterRow.cs",
    "DTOs/ReportCenter/Rows/ItCostSummaryResponse.cs",
    "DTOs/ReportCenter/Rows/LicenseRegisterRow.cs",
    "DTOs/ReportCenter/Rows/MaterialMovementRow.cs",
    "Services/Interfaces/IReportCenterService.cs",
    "Services/Interfaces/IReportExcelExportService.cs",
    "Services/ReportCenter/ReportCatalog.cs",
    "Services/ReportCenter/ReportCenterService.cs",
    "Services/ReportCenter/ReportDefinition.cs",
    "Services/ReportCenter/ReportExcelExportService.cs",
    "Services/ReportCenter/ReportExcelModels.cs",
]

DI_BLOCK = """
// Report Center - catalog, preview, and ClosedXML export.
builder.Services.AddScoped<
    IReportExcelExportService,
    ReportExcelExportService>();

builder.Services.AddScoped<
    IReportCenterService,
    ReportCenterService>();
"""


def patch_program(text: str) -> str:
    if "using PPS.LicenseManager.API.Services.ReportCenter;" not in text:
        needle = "using PPS.LicenseManager.API.Services.Interfaces;"
        if needle in text:
            text = text.replace(
                needle,
                needle + "\nusing PPS.LicenseManager.API.Services.ReportCenter;",
                1,
            )
        else:
            text = "using PPS.LicenseManager.API.Services.ReportCenter;\n" + text

    if "IReportCenterService" in text and "AddScoped<\n    IReportCenterService" in text.replace("\r\n", "\n"):
        return text
    if "IReportCenterService,\n    ReportCenterService" in text:
        return text

    markers = [
        "// Software License Utilization",
        "builder.Services.AddScoped<\n    IUtilizationUploadService",
        "var app = builder.Build();",
    ]
    for marker in markers:
        idx = text.find(marker)
        if idx != -1:
            return text[:idx] + DI_BLOCK + "\n" + text[idx:]

    raise SystemExit("Could not find an insertion point in Program.cs")


def patch_csproj(text: str) -> str:
    if "ClosedXML" in text:
        return text
    return text.replace(
        "</ItemGroup>",
        '    <PackageReference Include="ClosedXML" Version="0.104.2" />\n  </ItemGroup>',
        1,
    )


def main() -> None:
    if not HERE.is_dir():
        raise SystemExit(f"Missing source tree {HERE}")
    if not ROOT.is_dir():
        raise SystemExit(f"Missing {ROOT}. Run from /home/PPP-License-Manager")

    for rel in FILES:
        src = HERE / rel
        dest = ROOT / rel
        if not src.exists():
            raise SystemExit(f"Missing source file {src}")
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(src, dest)
        print(f"wrote {dest}")

    program = ROOT / "Program.cs"
    program.write_text(patch_program(program.read_text()))
    print(f"updated {program}")

    csproj = ROOT / "PPS.LicenseManager.API.csproj"
    if csproj.exists():
        original = csproj.read_text()
        updated = patch_csproj(original)
        if updated != original:
            csproj.write_text(updated)
            print(f"updated {csproj} (added ClosedXML)")
        else:
            print(f"ok     {csproj} already has ClosedXML")


if __name__ == "__main__":
    main()
