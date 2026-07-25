using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Requests;

public class UpdateUserRequest
{
    [Required]
    [StringLength(100)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string EmployeeCode { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [StringLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public int RoleId { get; set; }

    public int? CompanyId { get; set; }

    public int? DepartmentId { get; set; }

    public bool IsActive { get; set; }
}
