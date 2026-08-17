using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAudit;

public class StartAssetAuditRequest
{
    [Required]
    public int LocationId { get; set; }

    // Optional - narrows the expected-asset snapshot to one department
    // within the location instead of the whole site.
    public int? DepartmentId { get; set; }
}
