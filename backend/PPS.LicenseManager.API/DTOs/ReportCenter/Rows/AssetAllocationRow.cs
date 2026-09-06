using PPS.LicenseManager.API.Enums;

namespace PPS.LicenseManager.API.DTOs.ReportCenter.Rows;

public class AssetAllocationRow
{
    public string AssetTag { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string? CompanyName { get; set; }

    public string DepartmentName { get; set; } = string.Empty;

    public string AssignedToUserName { get; set; } = string.Empty;

    public string AssignedToEmail { get; set; } = string.Empty;

    public AssignmentType AssignmentType { get; set; }

    public string WorkMode { get; set; } = string.Empty;

    public DateTime AssignedOn { get; set; }

    public DateTime? ExpectedReturnDate { get; set; }

    public DateTime? ReturnedOn { get; set; }

    public string Status { get; set; } = string.Empty;

    public bool IsActive { get; set; }
}
