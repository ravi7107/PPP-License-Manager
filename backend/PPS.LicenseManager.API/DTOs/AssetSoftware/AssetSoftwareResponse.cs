namespace PPS.LicenseManager.API.DTOs.AssetSoftware;

public class AssetSoftwareResponse
{
    public int Id { get; set; }

    public int AssetId { get; set; }

    public string AssetTag { get; set; } = string.Empty;

    public int SoftwareId { get; set; }

    public string SoftwareName { get; set; } = string.Empty;

    public string Version { get; set; } = string.Empty;

    public string? LicenseKey { get; set; }

    public DateTime InstallDate { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Remarks { get; set; }

    public bool IsActive { get; set; }
}
