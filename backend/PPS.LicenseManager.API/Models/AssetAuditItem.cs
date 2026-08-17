using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One row per asset that is either expected in an AssetAudit's scope
 * (seeded with IsExpected = true, IsScanned = false when the session
 * starts) or scanned during it but not expected (created on first
 * scan with IsExpected = false). A (AssetAuditId, AssetId) unique
 * index means there is ever only one row per asset per session - a
 * second scan of the same asset updates ScannedAt/ScannedByUserId on
 * the existing row rather than creating a duplicate, and is reported
 * to the scanning user as a duplicate scan without changing ResultState.
 */
public class AssetAuditItem
{
    public int Id { get; set; }

    [Required]
    public int AssetAuditId { get; set; }

    public AssetAudit AssetAudit { get; set; } = null!;

    [Required]
    public int AssetId { get; set; }

    public Asset Asset { get; set; } = null!;

    public bool IsExpected { get; set; }

    public bool IsScanned { get; set; }

    public DateTime? ScannedAt { get; set; }

    public int? ScannedByUserId { get; set; }

    public User? ScannedByUser { get; set; }

    // Found, Missing, Unexpected, WrongLocation - set as scans come in
    // and finalized (Missing) when the session is completed. Never
    // "DuplicateScan" - that's a transient response to the scanning
    // user, not a stored fact about the asset (see comment above).
    [Required]
    [MaxLength(20)]
    public string ResultState { get; set; } = "Missing";

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
