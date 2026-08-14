using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialCostCenter;

public class CreateMaterialCostCenterRequest
{
    [Required]
    [StringLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    // Optional - null means available across every entity (shared/overhead
    // cost centers), matching MaterialCostCenter.CompanyId's comment.
    public int? CompanyId { get; set; }
}
