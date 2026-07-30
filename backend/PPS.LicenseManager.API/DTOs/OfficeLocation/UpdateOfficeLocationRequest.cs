using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.OfficeLocation;

public class UpdateOfficeLocationRequest
{
    [Required]
    public int CompanyId { get; set; }

    [Required]
    [MaxLength(50)]
    public string LocationCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string LocationName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Address { get; set; } = string.Empty;

    [MaxLength(100)]
    public string City { get; set; } = string.Empty;

    [MaxLength(100)]
    public string State { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = "India";

    public bool IsActive { get; set; }
}
