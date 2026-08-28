using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One invoice raised against a Purchase Requisition/PO - deliberately
 * 1:many (unlike PoNumber/PoDate/PoAmount, which stay 1:1 header fields on
 * PurchaseRequisition itself), because a single PO commonly gets invoiced
 * across more than one delivery (partial/staged shipments each carrying
 * their own invoice). Uploaded through the authenticated in-app PR detail
 * page (UploadedByUserId is always set here - unlike the PO upload flow,
 * there's no external/unauthenticated actor involved), independently of
 * Material Movement - see MaterialMovementReceiptId below.
 *
 * MaterialMovementReceiptId is an OPTIONAL link to the specific receive
 * event this invoice corresponds to ("once material receives, invoice will
 * upload against the PR/PO" - the business ask this satisfies). It's
 * optional, not required, because MaterialMovement has no direct link to
 * PurchaseRequisition at all (only a transitive one through a moved item's
 * linked Asset - see PurchaseRequisitionService.UploadInvoiceAsync's own
 * comment), and many PRs (software/license-only, or hardware never routed
 * through Material Movement) never have a receipt to link at all.
 */
public class PurchaseRequisitionInvoice
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    [MaxLength(50)]
    public string? InvoiceNumber { get; set; }

    public DateTime? InvoiceDate { get; set; }

    public decimal? InvoiceAmount { get; set; }

    [MaxLength(300)]
    public string? InvoiceDocumentPath { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    [Required]
    public int UploadedByUserId { get; set; }

    public User UploadedByUser { get; set; } = null!;

    // Optional - see class comment. Validated at upload time (see
    // UploadInvoiceAsync) to actually belong to this PR before being
    // accepted, so this FK never points at an unrelated movement's receipt.
    public int? MaterialMovementReceiptId { get; set; }

    public MaterialMovementReceipt? MaterialMovementReceipt { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
