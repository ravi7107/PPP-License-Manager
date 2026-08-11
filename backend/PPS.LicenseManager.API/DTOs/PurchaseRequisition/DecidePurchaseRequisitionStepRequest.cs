using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Decides the CURRENT approval step (identified server-side via
 * PurchaseRequisition.CurrentApprovalStepOrder, not passed by the client)
 * for the requisition in the route. Remarks are required when rejecting -
 * enforced in PurchaseRequisitionService.DecideStepAsync, not here, since
 * that rule depends on the Approve flag.
 */
public class DecidePurchaseRequisitionStepRequest
{
    [Required]
    public bool Approve { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
