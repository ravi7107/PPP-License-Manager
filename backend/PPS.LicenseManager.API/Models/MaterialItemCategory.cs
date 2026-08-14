using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - a grouping label for MaterialItems
 * (e.g. "Laptops", "Stationery", "Networking Spares"). Deliberately not
 * tied 1:1 to MaterialType - a category can contain items of different
 * material types; MaterialItem carries its own MaterialType.
 */
public class MaterialItemCategory
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
