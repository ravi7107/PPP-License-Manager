namespace PPS.LicenseManager.API.Models;

public class AssetSoftware
{
    public int Id { get; set; }

    public int AssetId { get; set; }
    public Asset? Asset { get; set; }

    public int SoftwareId { get; set; }
    public Software? Software { get; set; }

    public string Version { get; set; } = string.Empty;

    public string? LicenseKey { get; set; }

    public DateTime InstallDate { get; set; } = DateTime.UtcNow;

    // Installed / Removed
    public string Status { get; set; } = "Installed";

    public string? Remarks { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
