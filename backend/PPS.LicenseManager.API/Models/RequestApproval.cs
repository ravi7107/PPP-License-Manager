using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A single approve/reject decision recorded against a Request, kept even
 * after the fact as an audit trail (a request can only be decided once in
 * this version - approving/rejecting moves it out of Pending - but the
 * history table structure matches the legacy "approvals" table so it can
 * carry a multi-step workflow later without another migration).
 */
public class RequestApproval
{
    public int Id { get; set; }

    [Required]
    public int RequestId { get; set; }

    public Request Request { get; set; } = null!;

    // Null for decisions made by a user without a resolvable Users row
    // (matches the legacy behavior of allowing a name-only approver).
    public int? ApproverUserId { get; set; }

    public User? ApproverUser { get; set; }

    [Required]
    [MaxLength(200)]
    public string ApproverName { get; set; } = string.Empty;

    // Approved, Rejected
    [Required]
    [MaxLength(20)]
    public string Decision { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Comment { get; set; }

    public DateTime DecidedAt { get; set; } = DateTime.UtcNow;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
