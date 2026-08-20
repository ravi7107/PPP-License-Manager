namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationTierSettingsResponse
{
    public int? CompanyId { get; set; }
    public decimal HeavyMinPct { get; set; }
    public decimal RegularMinPct { get; set; }
    public decimal OccasionalMinPct { get; set; }
    public decimal LowMinPct { get; set; }
    public DateTime UpdatedAt { get; set; }
    public string? UpdatedByUserName { get; set; }
}

public class UpdateUtilizationTierSettingsRequest
{
    public int? CompanyId { get; set; }
    public decimal HeavyMinPct { get; set; }
    public decimal RegularMinPct { get; set; }
    public decimal OccasionalMinPct { get; set; }
    public decimal LowMinPct { get; set; }
}
