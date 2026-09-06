namespace PPS.LicenseManager.API.DTOs.ReportCenter;

public class ReportQueryRequest
{
    public int? CompanyId { get; set; }

    public int? DepartmentId { get; set; }

    // Client Master (Models/Client.cs) - only meaningful to reports that
    // declare a "client" filter field. Every existing report ignores this,
    // same as every other field on this shared request.
    public int? ClientId { get; set; }

    public int? LocationId { get; set; }

    public DateTime? DateFrom { get; set; }

    public DateTime? DateTo { get; set; }

    public string? Status { get; set; }

    public string? Search { get; set; }

    public int? VendorId { get; set; }

    public int? SoftwareId { get; set; }

    public string? AssetType { get; set; }

    public string? GroupBy { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public string? SortBy { get; set; }

    public string SortDirection { get; set; } = "asc";
}
