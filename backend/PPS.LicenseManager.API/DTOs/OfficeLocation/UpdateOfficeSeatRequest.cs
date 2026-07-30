using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.OfficeLocation;

public class UpdateOfficeSeatRequest
{
    [Required]
    public int OfficeFloorId { get; set; }

    [Required]
    [MaxLength(50)]
    public string SeatCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string SeatName { get; set; } = string.Empty;

    public int? DepartmentId { get; set; }

    public int? AssetId { get; set; }

    public int? UserId { get; set; }

    [Range(0, 100)]
    public decimal? XPosition { get; set; }

    [Range(0, 100)]
    public decimal? YPosition { get; set; }

    public bool IsActive { get; set; }
}
