namespace PPS.LicenseManager.API.DTOs.Utilization;

/*
 * [FromForm] metadata submitted alongside the uploaded file itself
 * (IFormFile is bound separately by the controller action). See
 * UtilizationUploadController.Upload.
 */
public class UploadUtilizationBatchRequest
{
    public string VendorSourceName { get; set; } = string.Empty;

    // Optional - usually left null for a company-wide multi-product
    // export (see UtilizationUploadBatch.SoftwareId's comment). Set when
    // the admin knows the whole file is scoped to one catalog product.
    public int? SoftwareId { get; set; }

    public int? CompanyId { get; set; }

    public int? DepartmentId { get; set; }

    // Required - real vendor exports (Autodesk's included) don't
    // reliably state their own reporting window (see
    // UtilizationUploadBatch.ReportingPeriodStart's comment).
    public DateOnly ReportingPeriodStart { get; set; }

    public DateOnly ReportingPeriodEnd { get; set; }

    // Reuse a previously-saved mapping (see UtilizationMappingProfile) -
    // when set, the preview step pre-fills the mapping from it instead of
    // running fresh auto-detection.
    public int? MappingProfileId { get; set; }

    // When the file's SHA-256 exactly matches an already-active batch,
    // UploadAsync returns that existing batch (DuplicateOfBatchId set)
    // instead of creating a new one - unless ForceUpload is true, in
    // which case a second batch is created deliberately. Never a silent
    // overwrite either way (see UtilizationUploadBatch.IsActive's
    // comment).
    public bool ForceUpload { get; set; }
}
