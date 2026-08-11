using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionLineItemRequest
{
    [Required]
    [MaxLength(300)]
    public string ItemDescription { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Category { get; set; }

    [Required]
    [Range(0.0001, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public decimal Quantity { get; set; }

    [MaxLength(30)]
    public string? UnitOfMeasure { get; set; }

    [Required]
    [Range(0, double.MaxValue, ErrorMessage = "Unit price cannot be negative.")]
    public decimal UnitPrice { get; set; }

    [MaxLength(500)]
    public string? Notes { get; set; }
}
