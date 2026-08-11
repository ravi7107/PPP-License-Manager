namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionLineItemResponse
{
    public int Id { get; set; }
    public int LineNumber { get; set; }
    public string ItemDescription { get; set; } = string.Empty;
    public string? Category { get; set; }
    public decimal Quantity { get; set; }
    public string? UnitOfMeasure { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }
    public string? Notes { get; set; }
}
