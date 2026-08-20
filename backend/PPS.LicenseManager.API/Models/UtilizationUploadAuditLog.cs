using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Append-only audit trail for the Utilization Analytics module, following
 * the same module-specific-audit-table convention as
 * PurchaseRequisitionAuditLog/MaterialMovementAuditLog (the generic
 * AuditLog table has no real writers anywhere in this codebase and is not
 * used here). Written by a private AddAuditLog() helper inside
 * UtilizationUploadService/UtilizationTierSettingsService.
 */
public class UtilizationUploadAuditLog
{
    public long Id { get; set; }

    // Nullable - ThresholdsChanged entries aren't tied to a batch.
    public int? UploadBatchId { get; set; }

    public UtilizationUploadBatch? UploadBatch { get; set; }

    // Uploaded, MappingSaved, Processed, Reprocessed, Deactivated,
    // ThresholdsChanged
    [Required]
    [MaxLength(30)]
    public string Action { get; set; } = string.Empty;

    public int? PerformedByUserId { get; set; }

    public User? PerformedByUser { get; set; }

    public string? Details { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
