using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One row per data row in an uploaded utilization report, preserved
 * EXACTLY as read from the file (RawDataJson: original column header ->
 * original cell value, no coercion). This is what keeps the module
 * vendor-agnostic at the storage layer - a wildly different vendor
 * export doesn't need a schema change here - and it is what makes every
 * analysis traceable back to real source data (RowNumber + RawDataJson),
 * never a number the app invented.
 *
 * This table is never edited after import. Corrections happen by
 * re-uploading a corrected file (a new UtilizationUploadBatch), not by
 * mutating a stored raw row.
 */
public class UtilizationRawRow
{
    public long Id { get; set; }

    [Required]
    public int UploadBatchId { get; set; }

    public UtilizationUploadBatch UploadBatch { get; set; } = null!;

    // 1-based position within the uploaded file (header row excluded) -
    // shown back to the admin so a flagged row can be found in the
    // original spreadsheet.
    public int RowNumber { get; set; }

    // jsonb - "<original column header>": "<original cell value>" for
    // every column in the file, regardless of whether it was mapped.
    [Required]
    public string RawDataJson { get; set; } = "{}";

    // SHA-256 of RawDataJson - used for intra-file and cross-upload
    // duplicate-row detection (a data-quality warning, never a hard
    // block, since the same person legitimately appears in different
    // reporting periods).
    [Required]
    [MaxLength(64)]
    public string RowHash { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
