using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A saved, reusable column mapping for one vendor/export source (e.g.
 * "Autodesk Account - Usage Export"). This is the concrete mechanism that
 * keeps the module vendor-agnostic per its "support future vendors
 * without a redesign" requirement: onboarding a new vendor means creating
 * a new profile row, never a schema/migration change. On a repeat upload
 * from the same source, the UI offers to reuse the matching profile
 * instead of starting the column-mapping step blank.
 */
public class UtilizationMappingProfile
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string VendorSourceName { get; set; } = string.Empty;

    // Excel, Csv
    [Required]
    [MaxLength(10)]
    public string FileFormat { get; set; } = "Excel";

    // jsonb - { "<normalized field name>": "<source column header>" },
    // plus simple transform hints (e.g. a date format string) where
    // needed. Interpreted by UtilizationUploadService when applying a
    // mapping to a batch's raw rows.
    [Required]
    public string ColumnMappingsJson { get; set; } = "{}";

    // Optional - set when this profile always targets one catalog
    // Software row rather than requiring per-row reconciliation.
    public int? SoftwareId { get; set; }

    public Software? Software { get; set; }

    [Required]
    public int CreatedByUserId { get; set; }

    public User CreatedByUser { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? LastUsedAt { get; set; }

    public bool IsActive { get; set; } = true;
}
