using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Department;

public class CreateDepartmentRequest
{
    [Required]
    public int CompanyId { get; set; }

    [Required]
    [StringLength(20)]
    public string DepartmentCode { get; set; } = string.Empty;

    [Required]
    [StringLength(100)]
    public string DepartmentName { get; set; } = string.Empty;

    [StringLength(255)]
    public string? Description { get; set; }
}
