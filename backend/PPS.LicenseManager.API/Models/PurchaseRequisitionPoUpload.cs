using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Append-only history of every PO upload/re-upload against a Purchase
 * Requisition, via the unauthenticated Finance email link (see
 * PurchaseRequisitionService.UploadPoByTokenAsync). That flow is
 * deliberately re-callable - a second upload simply overwrites
 * PurchaseRequisition.PoNumber/PoDate/PoAmount/PoDocumentPath with the
 * latest values, matching every existing reader's expectation that those
 * header fields always reflect "the current PO." This table exists purely
 * so nothing is lost when that happens: one row is inserted here,
 * capturing the values as they stood, immediately before each overwrite -
 * so a correction or revision never erases the paper trail. Rows are
 * never updated or deleted once written.
 */
public class PurchaseRequisitionPoUpload
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    [MaxLength(50)]
    public string? PoNumber { get; set; }

    public DateTime? PoDate { get; set; }

    public decimal? PoAmount { get; set; }

    // Every PO upload is written under a fresh GUID filename and the
    // previous file is never deleted (see UploadPoByTokenAsync), so this
    // path stays valid/downloadable even after the header's PoDocumentPath
    // moves on to a later upload.
    [MaxLength(300)]
    public string? PoDocumentPath { get; set; }

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Finance isn't a User in this app (same reasoning as
    // PurchaseRequisition.PoUploadedByUserId) - captured as the email the
    // Finance link was sent to, not a user id.
    [MaxLength(256)]
    public string? UploadedByEmail { get; set; }
}
