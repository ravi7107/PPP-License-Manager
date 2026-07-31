using System.ComponentModel.DataAnnotations;
using PPS.LicenseManager.API.Enums;
namespace PPS.LicenseManager.API.Models;

public class AssetAssignment
{
    public int Id { get; set; }

    [Required]
    public int AssetId { get; set; }

    [Required]
    public int UserId { get; set; }

    [Required]
    public int AssignedByUserId { get; set; }

    public DateTime AssignedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ReturnedOn { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Assigned";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    // Navigation
    public Asset Asset { get; set; } = null!;

    public User User { get; set; } = null!;

    public User AssignedByUser { get; set; } = null!;

    public AssignmentType AssignmentType { get; set; } = AssignmentType.Permanent;

public DateTime? ExpectedReturnDate { get; set; }

public int? OriginalAssignmentId { get; set; }
}
