namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementListItemResponse
{
    public int Id { get; set; }
    public string? MovementNumber { get; set; }
    public string MovementType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    public string? FromSummary { get; set; }
    public string? ToSummary { get; set; }

    public string RequestedByUserName { get; set; } = string.Empty;
    public int ItemCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
