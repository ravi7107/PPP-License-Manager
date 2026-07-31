using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class AuditLog
{
    [Key]
    public long Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Module { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    [Required]
    public long EntityId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Title { get; set; }

    public string? Description { get; set; }

    [MaxLength(100)]
    public string? PerformedBy { get; set; }

    [MaxLength(100)]
    public string? Department { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
