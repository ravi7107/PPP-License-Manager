using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A named Initiator or Approver for the Purchase Requisition workflow who is
 * identified only by name + email (Gmail, Office 365, or any other domain) -
 * deliberately NOT tied to a system User/login. This lets a PR route to
 * people who never sign into this app: they participate purely through the
 * emailed approval-token link (see PurchaseRequisitionApprovalToken), the
 * same mechanism already used for the "approve from email" flow.
 *
 * ContactType is a free-text string (Initiator, Approver, Both) rather than
 * a real enum column, matching the existing convention on
 * PurchaseRequisitionAttachment.AttachmentType.
 *
 * CompanyId is nullable: set it to scope a contact to one Entity/company
 * (mirrors how User-based approver candidates are scoped today); leave it
 * null for a contact who should be selectable across every company (e.g. a
 * shared external approver).
 */
public class PurchaseRequisitionContact
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    // Initiator, Approver, Both
    [Required]
    [MaxLength(20)]
    public string ContactType { get; set; } = "Approver";

    public int? CompanyId { get; set; }

    public Company? Company { get; set; }

    // Soft-deleted (deactivated) rather than hard-deleted so historical
    // approval steps/PRs that reference this contact keep resolving.
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public int? CreatedByUserId { get; set; }

    public User? CreatedByUser { get; set; }
}
