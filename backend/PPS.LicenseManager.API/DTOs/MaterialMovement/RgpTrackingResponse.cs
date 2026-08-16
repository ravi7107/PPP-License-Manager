namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class RgpTrackingResponse
{
    public RgpTrackingSummaryResponse Summary { get; set; } = new();

    public List<RgpTrackingItemResponse> Items { get; set; } = new();
}
