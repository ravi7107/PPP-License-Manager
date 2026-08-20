namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationMappingProfileResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string VendorSourceName { get; set; } = string.Empty;
    public string FileFormat { get; set; } = string.Empty;
    public Dictionary<string, string> ColumnMappings { get; set; } = new();
    public int? SoftwareId { get; set; }
    public string? SoftwareName { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastUsedAt { get; set; }
}
