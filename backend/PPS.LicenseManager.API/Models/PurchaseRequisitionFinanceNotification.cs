using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A record of one "notify Finance" action, fired automatically the moment
 * a purchase requisition reaches its final Approved state (see
 * PurchaseRequisitionService.DecideStepCoreAsync's isFinalApproval branch)
 * - the PR PDF plus any vendor-quotation attachments emailed to whichever
 * address is configured in PurchaseRequisitionSettings.FinanceNotification
 * Email. Finance is addressed by email (not modeled as an in-app user/
 * role), so this only stores an email address, not a User FK for who it
 * was sent to. Every share (including re-shares) gets its own row and its
 * own PurchaseRequisitionAuditLog entry.
 *
 * SentByUserId records who made the final approval decision that
 * triggered this notification (falling back to the PR's own requester on
 * the rare path where the final step was decided by an external Contact,
 * which has no User row) - there's no separate "click Share with Finance"
 * action anymore now that this fires automatically, so this column's
 * meaning is "whose decision caused this", not "who chose to share it".
 */
public class PurchaseRequisitionFinanceNotification
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    [Required]
    [MaxLength(200)]
    public string SentToEmail { get; set; } = string.Empty;

    [Required]
    public int SentByUserId { get; set; }

    public User SentByUser { get; set; } = null!;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    // Sent, Failed
    [Required]
    [MaxLength(20)]
    public string DeliveryStatus { get; set; } = "Sent";

    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    [MaxLength(200)]
    public string? EmailMessageId { get; set; }

    // Backs the "verify PR + quotation, upload PO copy" link sent to
    // Finance in the same email this row records. Same principle as
    // PurchaseRequisitionApprovalToken - only the SHA-256 hash is stored,
    // never the plaintext token. Unlike approval tokens this one is
    // deliberately NOT single-use: Finance may need to revisit the same
    // link to correct a PO number or replace the uploaded file, so it
    // stays usable until ExpiresAt rather than locking after first use.
    [MaxLength(128)]
    public string? TokenHash { get; set; }

    public DateTime? ExpiresAt { get; set; }
}
