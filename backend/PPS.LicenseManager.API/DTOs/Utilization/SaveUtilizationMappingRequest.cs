namespace PPS.LicenseManager.API.DTOs.Utilization;

public class SaveUtilizationMappingRequest
{
    // Normalized field name -> source column header, e.g.
    // { "RawUserIdentifier": "email", "DaysUsedInPeriod": "days_used" }.
    public Dictionary<string, string> ColumnMappings { get; set; } = new();

    // When set, persists this mapping as a reusable UtilizationMappingProfile
    // under this name for the batch's VendorSourceName/FileFormat.
    public string? SaveAsProfileName { get; set; }
}
