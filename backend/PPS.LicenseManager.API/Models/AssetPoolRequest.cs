using System.ComponentModel.DataAnnotations;
using PPS.LicenseManager.API.Enums;

namespace PPS.LicenseManager.API.Models;

public class AssetPoolRequest
{
    public int Id { get; set; }

    [Required]
    public int TemporaryPoolId { get; set; }

    public AssetTemporaryPool TemporaryPool { get; set; } = null!;

    [Required]
    public int RequestedByUserId { get; set; }

    public User RequestedByUser { get; set; } = null!;

    [Required]
    public int RequestedForUserId { get; set; }

    public User RequestedForUser { get; set; } = null!;

    public DateTime RequiredFrom { get; set; }

    public DateTime RequiredUntil { get; set; }

    [MaxLength(500)]
    public string Purpose { get; set; } = string.Empty;

    
    public AssetPoolRequestStatus Status { get; set; }
    = AssetPoolRequestStatus.Pending;

    public int? ApprovedByUserId { get; set; }

    public User? ApprovedByUser { get; set; }

    public DateTime? ApprovedAt { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
