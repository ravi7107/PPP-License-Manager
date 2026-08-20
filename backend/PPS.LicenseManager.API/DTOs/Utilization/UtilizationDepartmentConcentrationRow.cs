namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationDepartmentConcentrationRow
{
    // Real Department.DepartmentName when MatchedDepartmentId resolved,
    // otherwise the raw vendor-reported text labeled as unmatched by
    // IsMatchedToMaster = false - never silently merged with a real
    // department's numbers.
    public string DepartmentLabel { get; set; } = string.Empty;
    public bool IsMatchedToMaster { get; set; }

    public int HeavyCount { get; set; }
    public int RegularCount { get; set; }
    public int OccasionalCount { get; set; }
    public int LowCount { get; set; }
    public int InactiveCount { get; set; }
    public int NeverUsedCount { get; set; }

    public int TotalCount { get; set; }
}
