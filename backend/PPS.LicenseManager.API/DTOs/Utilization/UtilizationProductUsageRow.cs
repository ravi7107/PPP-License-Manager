namespace PPS.LicenseManager.API.DTOs.Utilization;

// Per-product breakdown of assigned vs. actually-used seats. This is the
// dimension real vendor exports (e.g. Autodesk's offering_name) tend to
// carry cleanly - unlike department/team fields, which are often noisy
// vendor-internal project/subscription labels rather than real org
// structure. Answers "which products are we over-licensed on," which
// the tier/department views alone don't surface when a company's
// account/activity/access-option fields don't vary (see the module's
// own dashboard - a flat "all active, all Subscription" export leaves
// the tier donut and department chart with little to show).
public class UtilizationProductUsageRow
{
    // Real Software.Name when SoftwareId resolved (row-level match - see
    // UtilizationFact.SoftwareId), otherwise the raw vendor-reported
    // offering text, labeled as unmatched by IsMatchedToSoftwareMaster -
    // never silently merged with a real software's numbers.
    public string SoftwareLabel { get; set; } = string.Empty;
    public bool IsMatchedToSoftwareMaster { get; set; }

    public int AssignedSeats { get; set; }
    public int UsedSeats { get; set; }
    public int UnusedSeats { get; set; }

    // Null (not 0) when there are no assigned seats for this product to
    // divide by - never fabricate a 0% where the real answer is "no data."
    public decimal? UtilizationPct { get; set; }
}
