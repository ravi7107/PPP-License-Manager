namespace PPS.LicenseManager.API.DTOs.Utilization;

// Heavy, Regular, Occasional, Low Utilization, Inactive, Never Used
public class UtilizationTierDistributionRow
{
    public string Tier { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public decimal PercentOfAssigned { get; set; }
}
