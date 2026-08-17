using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A physical asset audit ("stocktake") session, scoped to one office
 * location and optionally narrowed to one department. Started by a
 * user walking a site with the PPS Asset Scanner mobile app, scanning
 * everything physically present; each scan is recorded as a separate
 * AssetAuditItem, never as a mutation of Asset itself - this table is
 * a record of what was observed, not a change to the system of record.
 *
 * The expected-asset set (Assets whose current location resolves to
 * this audit's LocationId/DepartmentId at the moment the session
 * starts) is snapshotted into AssetAuditItems with IsExpected = true
 * as soon as the session starts, so that assets moved elsewhere by
 * someone else mid-audit don't silently change what "Missing" means
 * partway through a walk.
 */
public class AssetAudit
{
    public int Id { get; set; }

    [Required]
    public int LocationId { get; set; }

    public OfficeLocation Location { get; set; } = null!;

    // Optional further narrowing - e.g. audit only Engineering's assets
    // at this location rather than the whole site.
    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    [Required]
    public int StartedByUserId { get; set; }

    public User StartedByUser { get; set; } = null!;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;

    // InProgress, Completed, Cancelled
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "InProgress";

    public int? CompletedByUserId { get; set; }

    public User? CompletedByUser { get; set; }

    public DateTime? CompletedAt { get; set; }

    // Snapshot counters, updated as scans come in and finalized at
    // completion - kept on the session row so the mobile app's summary
    // screen ("Expected 425 / Scanned 391 / Missing 34 / Unexpected 3")
    // is a single cheap read instead of an aggregate query every time.
    public int ExpectedCount { get; set; }

    public int FoundCount { get; set; }

    public int MissingCount { get; set; }

    public int UnexpectedCount { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    public ICollection<AssetAuditItem> Items { get; set; } =
        new List<AssetAuditItem>();
}
