namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class MaterialMovementRow
{
    public string? MovementNumber { get; set; }

    public string MovementType { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? FromCompanyName { get; set; }

    public string? FromLocationName { get; set; }

    public string? FromDepartmentName { get; set; }

    public string? ToCompanyName { get; set; }

    public string? ToLocationName { get; set; }

    public string? ToDepartmentName { get; set; }

    public string? VendorName { get; set; }

    public string? ItemCode { get; set; }

    public string? ItemName { get; set; }

    public string? MaterialType { get; set; }

    public string? AssetTag { get; set; }

    public decimal? Quantity { get; set; }

    public string? UnitOfMeasure { get; set; }

    public string? SerialNumbers { get; set; }

    public string? Condition { get; set; }

    public string RequestedByUserName { get; set; } = string.Empty;

    public DateTime RequestedAt { get; set; }

    public string? Purpose { get; set; }
}
