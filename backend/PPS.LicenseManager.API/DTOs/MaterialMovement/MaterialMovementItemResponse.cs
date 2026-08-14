namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementItemResponse
{
    public int Id { get; set; }

    public int ItemId { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public string MaterialType { get; set; } = string.Empty;

    public int? AssetId { get; set; }
    public string? AssetTag { get; set; }
    public string? AssetName { get; set; }

    public decimal Quantity { get; set; }
    public string? UnitOfMeasure { get; set; }
    public string? SerialNumbers { get; set; }
    public string? Condition { get; set; }
    public string? Remarks { get; set; }
}
