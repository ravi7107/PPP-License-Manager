using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One line of a Purchase Requisition. LineTotal is computed and stored at
 * write time (Quantity * UnitPrice), not recalculated on read, so a PDF
 * generated later reflects exactly what was approved even if unit pricing
 * conventions change afterward.
 */
public class PurchaseRequisitionLineItem
{
    public int Id { get; set; }

    [Required]
    public int PurchaseRequisitionId { get; set; }

    public PurchaseRequisition PurchaseRequisition { get; set; } = null!;

    public int LineNumber { get; set; }

    [Required]
    [MaxLength(300)]
    public string ItemDescription { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Category { get; set; }

    public decimal Quantity { get; set; }

    [MaxLength(30)]
    public string? UnitOfMeasure { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal LineTotal { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
