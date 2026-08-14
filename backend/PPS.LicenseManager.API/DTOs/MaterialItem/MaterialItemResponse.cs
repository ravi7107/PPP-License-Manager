namespace PPS.LicenseManager.API.DTOs.MaterialItem;

public class MaterialItemResponse
{
    public int Id { get; set; }
    public string ItemCode { get; set; } = string.Empty;
    public string ItemName { get; set; } = string.Empty;
    public int CategoryId { get; set; }
    public string CategoryName { get; set; } = string.Empty;
    public string MaterialType { get; set; } = string.Empty;
    public string? UnitOfMeasure { get; set; }
    public bool IsSerialized { get; set; }
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
}
