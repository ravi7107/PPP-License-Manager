using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.OfficeLocation;

public class UpdateOfficeFloorRequest
{
    [Required]
    public int OfficeLocationId { get; set; }

    [Required]
    [MaxLength(50)]
    public string FloorCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FloorName { get; set; } = string.Empty;

    public int SortOrder { get; set; }

    public bool IsActive { get; set; }
}
