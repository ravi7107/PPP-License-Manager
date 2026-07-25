using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class AllocationRequest
{
    public int Id { get; set; }

    public Guid RequestReference { get; set; } = Guid.NewGuid();

    public int SoftwareId { get; set; }
    public Software Software { get; set; } = null!;

    public int RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public int? AssetId { get; set; }
    public Asset? Asset { get; set; }

    [MaxLength(1000)]
    public string BusinessJustification { get; set; } = string.Empty;

    public DateTime RequiredFrom { get; set; }

    public DateTime? RequiredTill { get; set; }

    [MaxLength(30)]
    public string Priority { get; set; } = "Medium";

    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    // ===== Approval Information =====

    public int? ApprovedByUserId { get; set; }
    public User? ApprovedByUser { get; set; }

    public DateTime? ApprovedAt { get; set; }

    [MaxLength(500)]
    public string? RejectionReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
