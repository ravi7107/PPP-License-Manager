namespace PPS.LicenseManager.API.DTOs.AssetSoftware;

public class UpdateAssetSoftwareRequest
{
    public string Version { get; set; } = string.Empty;

    public string? LicenseKey { get; set; }

    public DateTime InstallDate { get; set; }

    public string Status { get; set; } = "Installed";

    public string? Remarks { get; set; }

    public bool IsActive { get; set; }
}
