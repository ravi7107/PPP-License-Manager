namespace PPS.LicenseManager.API.DTOs.Availability;

public class AvailableLicenseResourceResponse
{
    public int UserUnavailabilityId { get; set; }

    public int ResourceAllocationId { get; set; }

    public int LicenseId { get; set; }

    public string LicenseAliasCode { get; set; } = string.Empty;

    public string SoftwareName { get; set; } = string.Empty;

    public int CurrentUserId { get; set; }

    public string CurrentUserName { get; set; } = string.Empty;

    public int? AssetId { get; set; }

    public string? AssetName { get; set; }

    public DateTime UnavailableFrom { get; set; }

    public DateTime UnavailableTill { get; set; }

    public string Reason { get; set; } = string.Empty;

    public DateTime? LicenseExpiryDate { get; set; }
}
