using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Inventory;

public class CreateInventoryCategoryRequest
{
    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(255)]
    public string? Description { get; set; }
}
