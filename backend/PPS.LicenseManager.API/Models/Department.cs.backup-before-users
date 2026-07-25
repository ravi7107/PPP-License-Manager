using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class Department
{
    public int Id { get; set; }
    public int CompanyId { get; set; }

    public Company? Company { get; set; }
    [Required]
    [MaxLength(20)]
    public string DepartmentCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string DepartmentName { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

