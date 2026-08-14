using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialTransporter;

public class UpdateMaterialTransporterRequest
{
    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactName { get; set; }

    [Phone]
    [StringLength(30)]
    public string? ContactPhone { get; set; }

    [EmailAddress]
    [StringLength(150)]
    public string? ContactEmail { get; set; }

    [StringLength(300)]
    public string? VehicleDetails { get; set; }

    public bool IsActive { get; set; }
}
