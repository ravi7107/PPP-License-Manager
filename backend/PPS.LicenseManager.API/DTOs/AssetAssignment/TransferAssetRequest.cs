using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetAssignment;

public class TransferAssetRequest
{
    [Required]
    public int NewUserId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }

    // The seat this assignment should occupy after the reassignment
    // completes (null = no seat / unseated). This always reflects the
    // caller's *final* intent - to keep the asset on its current seat,
    // resend that same SeatId; to move it, send a different (vacant) one;
    // to unseat it, send null.
    public int? SeatId { get; set; }
}
