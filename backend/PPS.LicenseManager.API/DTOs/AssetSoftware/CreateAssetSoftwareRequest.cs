namespace PPS.LicenseManager.API.DTOs.AssetSoftware;

public class CreateAssetSoftwareRequest
{
    public int AssetId { get; set; }

    public int SoftwareId { get; set; }

    public string Version { get; set; } = string.Empty;

    public string? LicenseKey { get; set; }

    public DateTime InstallDate { get; set; } = DateTime.UtcNow;

    public string Status { get; set; } = "Installed";

    public string? Remarks { get; set; }
}
