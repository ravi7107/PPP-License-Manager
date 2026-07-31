using System.ComponentModel.DataAnnotations;
using PPS.LicenseManager.API.Enums;

namespace PPS.LicenseManager.API.Models;

public class AssetTemporaryPool
{
    public int Id { get; set; }

    [Required]
    public int AssetId { get; set; }

    public Asset Asset { get; set; } = null!;

    [Required]
    public int CurrentAssignmentId { get; set; }

    public AssetAssignment CurrentAssignment { get; set; } = null!;

    [Required]
    public int ReleasedByUserId { get; set; }

    public User ReleasedByUser { get; set; } = null!;

    public DateTime AvailableFrom { get; set; }

    public DateTime AvailableUntil { get; set; }

    [MaxLength(500)]
    public string? Reason { get; set; }

    
    public TemporaryPoolStatus Status { get; set; }
    = TemporaryPoolStatus.Available;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
