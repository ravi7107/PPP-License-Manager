namespace PPS.LicenseManager.API.DTOs.Utilization;

// Histogram of DaysUsedInPeriod across usable facts for the current
// period/software selection - e.g. "0 days", "1-10 days", "11-20 days" ...
public class UtilizationUsageDistributionBucket
{
    public string BucketLabel { get; set; } = string.Empty;
    public int UserCount { get; set; }
}
