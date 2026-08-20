namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationLeastUsedUserRow
{
    public string DisplayName { get; set; } = string.Empty;
    public string RawUserIdentifier { get; set; } = string.Empty;
    public bool IsMatchedToUserMaster { get; set; }

    public string SoftwareLabel { get; set; } = string.Empty;
    public string? DepartmentLabel { get; set; }

    public int? DaysUsedInPeriod { get; set; }
    public DateOnly? LastUsedDate { get; set; }
    public string Tier { get; set; } = string.Empty;
}
