using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Module-wide Purchase Requisition settings. Deliberately a single row
 * (maintained by an app-level get-or-create in
 * PurchaseRequisitionSettingsService, not a DB-level singleton constraint -
 * there's no existing "admin-editable settings" pattern elsewhere in this
 * codebase to extend, so this is intentionally the smallest workable shape).
 *
 * FinanceNotificationEmail is nullable: until an admin sets it, the (not yet
 * built - see Phase 2) "share with Finance on final approval" step has
 * nowhere to send to and should skip with a clear log line rather than fail.
 */
public class PurchaseRequisitionSettings
{
    public int Id { get; set; }

    [MaxLength(200)]
    public string? FinanceNotificationEmail { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}
