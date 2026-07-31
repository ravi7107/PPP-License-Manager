using System.ComponentModel.DataAnnotations;
using PPS.LicenseManager.API.Enums;

namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class AssignAssetRequest
{
    [Required]
    public int AssetId { get; set; }

    [Required]
    public int UserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
public AssignmentType AssignmentType { get; set; }
    = AssignmentType.Permanent;

public DateTime? ExpectedReturnDate { get; set; }

}
