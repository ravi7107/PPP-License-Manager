using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialCostCenter;

public class UpdateMaterialCostCenterRequest
{
    [Required]
    [StringLength(20)]
    public string Code { get; set; } = string.Empty;

    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    public int? CompanyId { get; set; }

    public bool IsActive { get; set; }
}
