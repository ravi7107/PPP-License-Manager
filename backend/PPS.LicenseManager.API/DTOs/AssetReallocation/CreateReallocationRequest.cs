using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AssetReallocation;

public class CreateReallocationRequest
{
    [Required]
    public int AssetId { get; set; }

    // Reassign (default), Reseat, RemoteMode, ReturnToOffice - see
    // AssetReallocationRequest.RequestType. Existing callers that don't
    // send this get the original "move to a new user" behavior.
    [MaxLength(20)]
    public string RequestType { get; set; } = "Reassign";

    // Required for "Reassign"; must be omitted/null for every other
    // RequestType (validated server-side).
    public int? ProposedUserId { get; set; }

    // Required for "Reseat"; optional for "Reassign"/"ReturnToOffice";
    // ignored for "RemoteMode".
    public int? ProposedSeatId { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
