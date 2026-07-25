namespace PPS.LicenseManager.API.DTOs.Department;

public class DepartmentResponse
{
    public int Id { get; set; }

    public int CompanyId { get; set; }

    public string CompanyName { get; set; } = string.Empty;

    public string DepartmentCode { get; set; } = string.Empty;

    public string DepartmentName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
