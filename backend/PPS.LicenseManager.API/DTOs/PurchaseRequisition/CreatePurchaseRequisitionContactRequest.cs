using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class CreatePurchaseRequisitionContactRequest
{
    [Required]
    [StringLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [StringLength(200)]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    // Initiator, Approver, Both
    [Required]
    [StringLength(20)]
    public string ContactType { get; set; } = "Approver";

    // Null = selectable across every company/entity.
    public int? CompanyId { get; set; }
}
