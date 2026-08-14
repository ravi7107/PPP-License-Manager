using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - did not exist anywhere in this
 * codebase before. Selected on a movement's dispatch step when goods travel
 * via a third-party carrier rather than an internal vehicle/hand-carry.
 */
public class MaterialTransporter
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ContactName { get; set; }

    [MaxLength(30)]
    public string? ContactPhone { get; set; }

    [EmailAddress]
    [MaxLength(150)]
    public string? ContactEmail { get; set; }

    [MaxLength(300)]
    public string? VehicleDetails { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
