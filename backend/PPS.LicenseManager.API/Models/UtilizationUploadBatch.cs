using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One row per uploaded vendor software-utilization report (e.g. an
 * Autodesk Account usage export). This is the top of the Software
 * License Utilization & Analytics module's data model - see
 * UtilizationRawRow/UtilizationFact for how a batch's rows are stored
 * and analyzed.
 *
 * Deliberately vendor-agnostic: nothing here is shaped around Autodesk's
 * specific export columns. A real Autodesk company-wide export lists
 * many different products (OfferingName) in one file, so SoftwareId is
 * intentionally nullable here - reconciliation to the Software catalog
 * happens per-row on UtilizationFact, not once per batch. VendorSourceName
 * plus MappingProfileId is what lets a second vendor (Adobe, etc.) be
 * onboarded later without a schema change - see UtilizationMappingProfile.
 *
 * The uploaded file itself is NEVER deleted or overwritten (see
 * StoredPath) - "deleting" a batch only sets IsActive = false and excludes
 * it from analysis, per the module's audit/traceability requirements.
 */
public class UtilizationUploadBatch
{
    public int Id { get; set; }

    // Usually null - most real vendor exports (e.g. a company-wide
    // Autodesk usage report) cover many products in one file. Only set
    // when the whole batch is confidently scoped to one Software row
    // (e.g. via a saved MappingProfile that always targets one product).
    public int? SoftwareId { get; set; }

    public Software? Software { get; set; }

    [Required]
    [MaxLength(150)]
    public string VendorSourceName { get; set; } = string.Empty;

    public int? MappingProfileId { get; set; }

    public UtilizationMappingProfile? MappingProfile { get; set; }

    // The confirmed column mapping for THIS batch (normalized field name ->
    // source column header), set by SaveMappingAsync and applied by
    // ProcessAsync. Independent of MappingProfileId - a batch can confirm
    // an ad-hoc mapping without ever saving it as a reusable profile.
    public string? ConfirmedMappingJson { get; set; }

    [Required]
    [MaxLength(260)]
    public string OriginalFileName { get; set; } = string.Empty;

    [Required]
    [MaxLength(300)]
    public string StoredPath { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ContentType { get; set; } = string.Empty;

    public long FileSizeBytes { get; set; }

    // SHA-256 of the full file - the primary duplicate-upload detection
    // mechanism (see UtilizationUploadService). Never used to silently
    // reject a re-upload, only to warn and let the admin decide.
    [Required]
    [MaxLength(64)]
    public string FileHash { get; set; } = string.Empty;

    // Admin-entered at upload time - real vendor exports (Autodesk's
    // included) do not reliably state their own reporting window, so this
    // is the only value guaranteed to exist for every batch regardless of
    // vendor format. Required so every analysis can always show "for the
    // period X-Y" per the module's data-quality/trust rules, and so
    // Pass 2's historical/trend analysis has something to key off.
    [Required]
    public DateOnly ReportingPeriodStart { get; set; }

    [Required]
    public DateOnly ReportingPeriodEnd { get; set; }

    // Uploaded -> Mapped -> Processed -> Failed
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Uploaded";

    public int TotalRowCount { get; set; }
    public int UsableRowCount { get; set; }
    public int WarningRowCount { get; set; }

    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    [Required]
    public int UploadedByUserId { get; set; }

    public User UploadedByUser { get; set; } = null!;

    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ProcessedAt { get; set; }

    // Soft-delete only - the physical file and every raw/fact row are
    // preserved regardless (see the module's "never discard uploaded
    // reports" rule). "Deleting" a batch just excludes it from analysis.
    public bool IsActive { get; set; } = true;
}
