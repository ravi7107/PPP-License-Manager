using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - did not exist anywhere in this
 * codebase before. Optionally scoped to a Company; a null CompanyId means
 * the cost center is available across every entity (e.g. shared overhead
 * centers).
 */
public class MaterialCostCenter
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    public int? CompanyId { get; set; }

    public Company? Company { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
