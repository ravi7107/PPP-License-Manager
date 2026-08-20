namespace PPS.LicenseManager.API.DTOs.Utilization;

public class UtilizationColumnMappingSuggestion
{
    // One of UtilizationNormalizedFields' constants.
    public string NormalizedField { get; set; } = string.Empty;

    public bool IsRequired { get; set; }

    // Null when auto-detect found no confident match - the frontend
    // renders this as "Unmapped", requiring the admin to pick one (or
    // leave optional fields unmapped).
    public string? SuggestedSourceColumn { get; set; }
}

public class UtilizationUploadPreviewResponse
{
    public int BatchId { get; set; }

    public List<string> SourceColumns { get; set; } = new();

    public List<UtilizationColumnMappingSuggestion> Suggestions { get; set; } = new();

    // First few rows, raw column header -> raw cell value, for the admin
    // to sanity-check the mapping against real data before confirming.
    public List<Dictionary<string, string?>> SampleRows { get; set; } = new();

    public int TotalRowCount { get; set; }

    // Set when a MappingProfile matching this file's VendorSourceName +
    // FileFormat already exists, so the frontend can offer "reuse saved
    // mapping" instead of the auto-detected one.
    public int? MatchingMappingProfileId { get; set; }
    public string? MatchingMappingProfileName { get; set; }
}
