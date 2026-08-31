using PPS.LicenseManager.API.Services.ReportCenter;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IReportExcelExportService
{
    byte[] BuildWorkbook<TRow>(
        ExcelWorkbookMeta meta,
        IReadOnlyList<TRow> rows,
        IReadOnlyList<ExcelColumn<TRow>> columns,
        IReadOnlyList<ExcelBreakdownSheet>? breakdownSheets = null);
}
