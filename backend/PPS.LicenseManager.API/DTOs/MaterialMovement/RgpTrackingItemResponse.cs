namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

/*
 * One outstanding-or-closed RGP (Returnable Gate Pass) row - a dispatched
 * MovementType == "TemporaryMovement". ReturnStatus is computed at read
 * time (Pending / Overdue / Returned), not stored as its own column -
 * "Overdue" is derived by comparing ExpectedReturnDate to today rather
 * than a scheduled job flipping a stored status, since no such job exists
 * yet (see MaterialMovementReturn.cs's own comment on that being later-
 * phase work).
 */
public class RgpTrackingItemResponse
{
    public int Id { get; set; }

    public string? MovementNumber { get; set; }
    public string? GatePassNumber { get; set; }

    public string? FromSummary { get; set; }
    public string? ToSummary { get; set; }

    public string RequestedByUserName { get; set; } = string.Empty;

    public DateTime DispatchedAt { get; set; }
    public DateTime ExpectedReturnDate { get; set; }
    public DateTime? ActualReturnDate { get; set; }

    // "Pending" | "Overdue" | "Returned"
    public string ReturnStatus { get; set; } = string.Empty;

    // 0 unless ReturnStatus == "Overdue".
    public int DaysOverdue { get; set; }
}
