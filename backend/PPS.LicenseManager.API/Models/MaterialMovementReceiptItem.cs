using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Per-line receipt confirmation - supports partial receipt (QuantityReceived
 * less than the dispatched MaterialMovementItem.Quantity) and per-line
 * discrepancy notes, one row per MovementItem actually received.
 */
public class MaterialMovementReceiptItem
{
    public int Id { get; set; }

    [Required]
    public int ReceiptId { get; set; }
    public MaterialMovementReceipt Receipt { get; set; } = null!;

    [Required]
    public int MovementItemId { get; set; }
    public MaterialMovementItem MovementItem { get; set; } = null!;

    public decimal QuantityReceived { get; set; }

    [MaxLength(30)]
    public string? Condition { get; set; }

    [MaxLength(500)]
    public string? DiscrepancyNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
