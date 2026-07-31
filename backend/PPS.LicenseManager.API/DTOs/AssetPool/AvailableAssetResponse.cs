namespace PPS.LicenseManager.API.DTOs.AssetPool;

public class AvailableAssetResponse
{
    public int PoolId { get; set; }

    public int AssetId { get; set; }

    public string AssetCode { get; set; } = string.Empty;

    public string AssetName { get; set; } = string.Empty;

    public string AssetType { get; set; } = string.Empty;

    public int CurrentUserId { get; set; }

    public string CurrentUserName { get; set; } = string.Empty;

    public DateTime AvailableFrom { get; set; }

    public DateTime AvailableUntil { get; set; }

    public string Reason { get; set; } = string.Empty;
}
