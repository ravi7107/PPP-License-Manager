namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

// One row per detected data-integrity issue, not one row per Asset/
// License/LicensePurchase record - see
// ReportCenterService.BuildDataQualityIssuesAsync for the checks. Built
// and paginated in memory (not via PaginateAndBuildAsync's IQueryable
// pattern) since the underlying candidates come from three differently-
// shaped queries merged together in C#, matching the one other
// intentional in-memory-pagination exception already used in this
// catalog for the Purchase-to-Asset & License Mapping report.
public class DataQualityIssueRow
{
    public string EntityType { get; set; } = string.Empty;

    public string RecordIdentifier { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string? DepartmentName { get; set; }

    public string IssueDescription { get; set; } = string.Empty;

    public string Severity { get; set; } = string.Empty;
}
