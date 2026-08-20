using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * The normalized row the analytics engine (UtilizationAnalysisService)
 * actually queries - one per raw row that was mapped, produced by
 * applying a UtilizationMappingProfile (or an ad-hoc mapping) to a
 * UtilizationRawRow. Every field here is a MAPPED/NORMALIZED value, never
 * a calculated one (no percentages, no tier, no cost) - those are always
 * computed on read from these facts, per the module's "separate raw data
 * from calculated data" rule. RawRowId keeps every fact traceable back to
 * exactly one source row.
 *
 * Fields are nullable by design: a real vendor row can be missing usage
 * evidence, and this table must be able to say so (via DataQualityFlags /
 * IsUsableForCalculation) rather than silently defaulting to 0, which
 * would fabricate a number nobody actually reported.
 */
public class UtilizationFact
{
    public long Id { get; set; }

    [Required]
    public int UploadBatchId { get; set; }

    public UtilizationUploadBatch UploadBatch { get; set; } = null!;

    [Required]
    public long RawRowId { get; set; }

    public UtilizationRawRow RawRow { get; set; } = null!;

    // Reconciled per-row against the Software catalog (see
    // UtilizationUploadService's reconciliation logic) - a batch can, and
    // in a real company-wide Autodesk export usually does, cover many
    // different products.
    public int? SoftwareId { get; set; }

    public Software? Software { get; set; }

    // What the report itself called the product (e.g. "Architecture
    // Engineering & Construction Collection") - kept even when SoftwareId
    // matched, for audit/traceability.
    [Required]
    [MaxLength(200)]
    public string RawSoftwareText { get; set; } = string.Empty;

    public int? MatchedUserId { get; set; }

    public User? MatchedUser { get; set; }

    // The report's own user identity string (typically email) - always
    // populated, kept even when matched.
    [Required]
    [MaxLength(200)]
    public string RawUserIdentifier { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? RawUserDisplayName { get; set; }

    [MaxLength(150)]
    public string? RawDepartmentText { get; set; }

    public int? MatchedDepartmentId { get; set; }

    public Department? MatchedDepartment { get; set; }

    // Vendor-reported location/office text only - there is no reliable
    // User -> OfficeLocation join in this app today, so this is never
    // reconciled against the OfficeLocation master (would misrepresent an
    // unmatched string as real master data). Populated only when the
    // source file actually has a location-style column.
    [MaxLength(150)]
    public string? RawLocationText { get; set; }

    public DateOnly? LastUsedDate { get; set; }

    public int? DaysUsedInPeriod { get; set; }

    public decimal? MonthlyAverageUsage { get; set; }

    [MaxLength(100)]
    public string? VersionUsed { get; set; }

    // Whether the vendor report itself says this seat is currently
    // assigned (independent of the internal ResourceAllocation/License
    // "assigned" join path - see the module's data-model notes on why
    // the two are kept separate).
    public bool? AssignedFlag { get; set; }

    [MaxLength(30)]
    public string? RawStatusText { get; set; }

    // Comma-separated flags: MissingUsageData, MissingDate, UnmatchedUser,
    // WeakUserMatch, SoftwareMismatch, DuplicateRow, InvalidDate.
    [MaxLength(300)]
    public string? DataQualityFlags { get; set; }

    // Computed once at import time from DataQualityFlags. The analysis
    // engine filters on this for every KPI that depends on usage
    // evidence, rather than re-deriving "is this row good enough" in
    // every query.
    public bool IsUsableForCalculation { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
