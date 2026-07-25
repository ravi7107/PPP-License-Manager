using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class ResourceAllocation
{
    public int Id { get; set; }

    public Guid AllocationReference { get; set; } = Guid.NewGuid();

    [Required]
    public int LicenseId { get; set; }

    public License License { get; set; } = null!;

    [Required]
    public int UserId { get; set; }

    public User User { get; set; } = null!;

    public int? AssetId { get; set; }

    public Asset? Asset { get; set; }

    [Required]
    public int AllocatedByUserId { get; set; }

    public User AllocatedByUser { get; set; } = null!;

    public DateTime AllocatedOn { get; set; } = DateTime.UtcNow;

    public DateTime? ExpectedReturnDate { get; set; }

    public DateTime? ActualReturnDate { get; set; }

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Allocated";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
