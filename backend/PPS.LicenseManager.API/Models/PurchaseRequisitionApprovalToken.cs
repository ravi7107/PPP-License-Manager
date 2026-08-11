using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A secure, single-use token backing an approval step's "approve/reject
 * from email" link. The plaintext token is never stored - only its SHA-256
 * hash, the same principle as password-reset tokens, so a database leak
 * doesn't hand out usable approval links. ConsumedAt is set exactly once
 * (guarded by an atomic conditional update in the service layer) to
 * enforce single use; ExpiresAt bounds how long a stale/unused link works.
 *
 * One token per approval step - the email landing page offers both
 * Approve and Reject on the same link, so the token identifies "who may
 * decide this step," not "which decision."
 */
public class PurchaseRequisitionApprovalToken
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionApprovalStepId { get; set; }

    public PurchaseRequisitionApprovalStep ApprovalStep { get; set; } = null!;

    [Required]
    [MaxLength(128)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime? ConsumedAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
