namespace PPS.LicenseManager.API.DTOs.Asset;

public class AssetFilterRequest
{
    public string? Search { get; set; }

    public int? DepartmentId { get; set; }

    public string? AssetType { get; set; }

    public string? Manufacturer { get; set; }

    public string? Status { get; set; }

    public bool? IsActive { get; set; }

    // Rental tracking - "Owned" or "Rented".
    public string? OwnershipType { get; set; }

    public bool? DualMonitor { get; set; }

    public int Page { get; set; } = 1;

    public int PageSize { get; set; } = 20;

    public string SortBy { get; set; } = "AssetTag";

    public string SortDirection { get; set; } = "asc";
}
