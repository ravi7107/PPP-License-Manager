namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionAttachmentResponse
{
    public int Id { get; set; }
    public string AttachmentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string StoredPath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int UploadedByUserId { get; set; }
    public string? UploadedByUserName { get; set; }
    public DateTime UploadedAt { get; set; }
}
