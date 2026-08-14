using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A user-uploaded file attached to a movement (photos, delivery challans,
 * etc.) - same wwwroot/uploads, GUID-named-on-disk, magic-byte-validated
 * convention as PurchaseRequisitionAttachment. Distinct from
 * MaterialMovementDispatch.GatePassPdfPath, which is a system-generated
 * artifact, not a user upload.
 */
public class MaterialMovementAttachment
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

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
