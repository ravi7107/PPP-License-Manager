using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class Notification
{
    public int Id { get; set; }

    // User who receives this notification.
    [Required]
    public int UserId { get; set; }

    public User User { get; set; } = null!;

    // Examples:
    // ReallocationRequested
    // ReallocationApproved
    // ReallocationRejected
    // ReturnDueSoon
    // ReturnOverdue
    // LicenseReturned
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    // Allows frontend navigation to the related record.
    // Example: ResourceReallocationRequest
    [MaxLength(100)]
    public string? RelatedEntityType { get; set; }

    public int? RelatedEntityId { get; set; }

    // Used to prevent duplicate notifications.
    // Example:
    // ReallocationRequested:8:User:2
    [MaxLength(200)]
    public string? DeduplicationKey { get; set; }

    public bool IsRead { get; set; } = false;

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
