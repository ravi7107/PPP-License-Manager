using System.Security.Claims;
using PPS.LicenseManager.API.DTOs.ReportCenter;

namespace PPS.LicenseManager.API.Services.ReportCenter;

public class ReportDefinition
{
    public string Id { get; init; } = string.Empty;

    public string Title { get; init; } = string.Empty;

    public string Category { get; init; } = string.Empty;

    public string Description { get; init; } = string.Empty;

    public List<ReportFilterFieldDefinition> Filters { get; init; } = new();

    public Func<ReportQueryRequest, bool, int?, Task<object>> RunPreview { get; init; }
        = (_, _, _) => Task.FromResult<object>(new object());

    public Func<ReportQueryRequest, bool, int?, ClaimsPrincipal, Task<(byte[] Bytes, string ContentType, string FileName)>> RunExport { get; init; }
        = (_, _, _, _) => Task.FromResult<(byte[], string, string)>((Array.Empty<byte>(), "application/octet-stream", "empty.xlsx"));
}

public class ReportFilterFieldDefinition
{
    public string Key { get; init; } = string.Empty;

    public string Label { get; init; } = string.Empty;

    public string Type { get; init; } = string.Empty;

    public string[]? Options { get; init; }

    public string? DefaultValue { get; init; }
}

public class ReportExportTooLargeException : Exception
{
    public int MatchCount { get; }

    public ReportExportTooLargeException(int matchCount)
        : base($"This report has {matchCount:N0} matching rows - narrow your filters (Entity, Department, or date range) before exporting.")
    {
        MatchCount = matchCount;
    }
}
