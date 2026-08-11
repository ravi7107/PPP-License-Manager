using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A user-uploaded file attached to a Purchase Requisition (vendor
 * quotation, or other supporting document). Not to be confused with the
 * generated approval PDF, which lives on PurchaseRequisition.PdfPath - this
 * table is only for files the requester (or, later, Finance sharing)
 * uploads, following the same validated-upload pattern as office floor
 * maps (magic-byte check, extension whitelist, size limit).
 */
public class PurchaseRequisitionAttachment
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    // VendorQuotation, Supporting
    [Required]
    [MaxLength(30)]
    public string AttachmentType { get; set; } = "VendorQuotation";

    [Required]
    [MaxLength(260)]
    public string FileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string StoredPath { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    [Required]
    public int UploadedByUserId { get; set; }

    public User UploadedByUser { get; set; } = null!;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;
}
