using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One receipt record per movement (one-to-one via the unique index on
 * MovementId). HasDiscrepancy summarizes whether any line in
 * ReceiptItems reported a QuantityReceived short of what was dispatched,
 * or a Condition other than what was expected - the receiving screen sets
 * this from the per-line detail rather than it being independently
 * user-entered.
 */
public class MaterialMovementReceipt
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    [Required]
    public int ReceivedByUserId { get; set; }
    public User ReceivedByUser { get; set; } = null!;

    public DateTime ReceivedAt { get; set; } = DateTime.UtcNow;

    public bool HasDiscrepancy { get; set; }

    public string? DiscrepancyNotes { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MaterialMovementReceiptItem> ReceiptItems { get; set; } =
        new List<MaterialMovementReceiptItem>();
}
