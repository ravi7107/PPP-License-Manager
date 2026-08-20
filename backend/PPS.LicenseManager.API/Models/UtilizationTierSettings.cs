namespace PPS.LicenseManager.API.Models;

/*
 * Admin-configurable usage-tier thresholds (Heavy / Regular / Occasional /
 * Low Utilization / Inactive), expressed as a minimum % of the reporting
 * period's calendar days used. Never hardcoded in the analysis engine -
 * see UtilizationAnalysisService, which reads the applicable row at query
 * time. Editing thresholds re-classifies existing uploaded data on the
 * next read without ever mutating a stored UtilizationFact row, keeping
 * raw/calculated data separated per the module's rules.
 *
 * Same "single settings row, get-or-create" shape as
 * PurchaseRequisitionSettings. CompanyId is nullable - null is the
 * org-wide default, following the same nullable-scoping convention as
 * LicensePurchase.CompanyId.
 */
public class UtilizationTierSettings
{
    public int Id { get; set; }

    public int? CompanyId { get; set; }

    public Company? Company { get; set; }

    // Minimum % of period days used to qualify for each tier, checked
    // from the top down (Heavy first). A row below every threshold and
    // with zero days used falls into "Never Used"; a row below every
    // threshold but with some usage falls into "Inactive".
    public decimal HeavyMinPct { get; set; } = 60m;
    public decimal RegularMinPct { get; set; } = 30m;
    public decimal OccasionalMinPct { get; set; } = 10m;
    public decimal LowMinPct { get; set; } = 1m;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public int? UpdatedByUserId { get; set; }

    public User? UpdatedByUser { get; set; }
}
