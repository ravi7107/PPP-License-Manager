namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * One Approved PR line item that still has unfulfilled quantity remaining -
 * the list an Asset/License purchase creation form picks from when
 * optionally linking to a Purchase Requisition. See
 * PurchaseRequisitionService.GetAvailableLinesForLinkingAsync.
 */
public class PurchaseRequisitionAvailableLineResponse
{
    public int LineItemId { get; set; }

    public int PurchaseRequisitionId { get; set; }

    public string PrNumber { get; set; } = string.Empty;

    public string ItemDescription { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal FulfilledQuantity { get; set; }

    public decimal RemainingQuantity { get; set; }
}
