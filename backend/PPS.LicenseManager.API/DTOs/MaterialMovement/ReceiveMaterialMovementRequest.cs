namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

// Entirely optional - if omitted (or Items is null/empty), every line
// item on the movement is treated as fully received in its original
// (as-dispatched) quantity/condition, matching the simple "scan the QR,
// tap Receive" mobile flow described for this feature. Items only needs
// to be populated when the receiving side wants to record a short
// quantity, a different condition, or a per-line discrepancy note for one
// or more specific lines - see MaterialMovementService.ReceiveAsync.
public class ReceiveMaterialMovementRequest
{
    public string? DiscrepancyNotes { get; set; }

    public List<ReceiveMaterialMovementItemRequest>? Items { get; set; }
}

public class ReceiveMaterialMovementItemRequest
{
    public int MovementItemId { get; set; }

    // Null means "received in full" - defaults to the line's original
    // Quantity in MaterialMovementService.ReceiveAsync.
    public decimal? QuantityReceived { get; set; }

    // Null means "unchanged" - defaults to the line's original Condition.
    public string? Condition { get; set; }

    public string? DiscrepancyNotes { get; set; }
}
