using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A Team Lead's request to move a hardware asset to a different user
 * (and optionally a different office seat). Unlike a direct
 * AssetAssignmentService.TransferAsync call - which only Super Admin/IT
 * Admin can perform - this record captures the *intent* and only takes
 * effect once BOTH a Super Admin and an IT Admin have independently
 * approved it. Either one rejecting rejects the whole request.
 */
public class AssetReallocationRequest
{
    public int Id { get; set; }

    [Required]
    public int AssetId { get; set; }

    public Asset Asset { get; set; } = null!;

    // The active assignment this request proposes to change. Kept for
    // reference/history even after a decision is made; not required to
    // still be active by the time a decision happens (it's re-validated
    // at decision time).
    public int? CurrentAssignmentId { get; set; }

    public AssetAssignment? CurrentAssignment { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }

    public User RequestedByUser { get; set; } = null!;

    // Required for "Reassign" (move to a new user); left null for
    // "Reseat"/"RemoteMode"/"ReturnToOffice", which don't change who holds
    // the asset. See RequestType.
    public int? ProposedUserId { get; set; }

    public User? ProposedUser { get; set; }

    // Required for "Reseat"; optional for "Reassign" and "ReturnToOffice";
    // unused for "RemoteMode" (going remote always clears the seat).
    public int? ProposedSeatId { get; set; }

    public OfficeSeat? ProposedSeat { get; set; }

    // Reassign (default - move this asset to a different user, optionally
    // also a different seat), Reseat (same user, move to a different
    // seat), RemoteMode (mark the current assignment as WFH and vacate its
    // seat), ReturnToOffice (revert a WFH assignment back to Office,
    // optionally into a new seat).
    [Required]
    [MaxLength(20)]
    public string RequestType { get; set; } = "Reassign";

    [MaxLength(500)]
    public string? Remarks { get; set; }

    // Pending, Approved, Rejected, Cancelled
    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Pending";

    // -----------------------------------------------------------
    // Super Admin decision
    // -----------------------------------------------------------

    [Required]
    [MaxLength(20)]
    public string AdminDecision { get; set; } = "Pending";

    public int? AdminDecidedByUserId { get; set; }

    public User? AdminDecidedByUser { get; set; }

    public DateTime? AdminDecidedAt { get; set; }

    [MaxLength(500)]
    public string? AdminRemarks { get; set; }

    // -----------------------------------------------------------
    // IT Admin decision
    // -----------------------------------------------------------

    [Required]
    [MaxLength(20)]
    public string ItDecision { get; set; } = "Pending";

    public int? ItDecidedByUserId { get; set; }

    public User? ItDecidedByUser { get; set; }

    public DateTime? ItDecidedAt { get; set; }

    [MaxLength(500)]
    public string? ItRemarks { get; set; }

    // The new assignment created once both approvals are in.
    public int? ResultingAssignmentId { get; set; }

    public AssetAssignment? ResultingAssignment { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }
}
