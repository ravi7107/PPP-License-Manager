using PPS.LicenseManager.API.DTOs.ReportCenter;

namespace PPS.LicenseManager.API.Services.ReportCenter;

public class ExcelWorkbookMeta
{
    public string ReportTitle { get; set; } = string.Empty;

    public string GeneratedByUserName { get; set; } = string.Empty;

    public DateTime GeneratedAtUtc { get; set; } = DateTime.UtcNow;

    public List<AppliedFilterEntry> AppliedFilters { get; set; } = new();

    public int RecordCount { get; set; }
}

public enum ExcelNumberFormat
{
    Text,
    Number,
    Currency,
    Date,
    Percent,
}

public class ExcelColumn<TRow>
{
    public string Header { get; init; } = string.Empty;

    public Func<TRow, object?> ValueSelector { get; init; } = _ => null;

    public ExcelNumberFormat Format { get; init; } = ExcelNumberFormat.Text;

    public double? Width { get; init; }
}

public class ExcelBreakdownSheet
{
    public string SheetName { get; init; } = string.Empty;

    public List<string> Headers { get; init; } = new();

    public List<object?[]> Rows { get; init; } = new();
}
