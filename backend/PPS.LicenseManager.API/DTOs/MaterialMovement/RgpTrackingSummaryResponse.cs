namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class RgpTrackingSummaryResponse
{
    public int TotalCount { get; set; }
    public int PendingCount { get; set; }
    public int OverdueCount { get; set; }
    public int ReturnedCount { get; set; }
}
