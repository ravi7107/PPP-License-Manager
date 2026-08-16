using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class UpdatePurchaseRequisitionContactRequest
{
    [Required]
    [StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string ContactType { get; set; } = "Approver";

    public int? CompanyId { get; set; }

    public bool IsActive { get; set; }
}
