using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Module-specific audit trail, following the actually-used pattern in this
 * codebase (PurchaseRequisitionAuditLog + a private AddAuditLog() helper
 * in the owning service) rather than the generic AuditLog table, which has
 * zero writers anywhere. One row per state transition/action on a
 * movement. Unlike PurchaseRequisitionAuditLog, IpAddress is actually
 * populated here (that field exists on PR's table too but is never
 * written - a known gap flagged in the Phase 2 design doc).
 */
public class MaterialMovementAuditLog
{
    public long Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string Action { get; set; } = string.Empty;

    // Nullable - system-triggered actions (e.g. an automated overdue-return
    // flag) have no acting user.
    public int? ActorUserId { get; set; }
    public User? ActorUser { get; set; }

    public DateTime ActionAt { get; set; } = DateTime.UtcNow;

    public string? Details { get; set; }

    [MaxLength(50)]
    public string? IpAddress { get; set; }
}
