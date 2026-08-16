using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * A Team Lead/employee's request for a new software license, a
 * reallocation/release of one, or a hardware allocation/transfer/return -
 * submitted for IT Administrator review via the Approvals page. Mirrors
 * the shape of the legacy UI-Bakery-era "requests" table (see
 * frontend/migrations/1784356230_extend_requests_approval_workflow.sql)
 * but is now backed by a real EF Core model + REST API instead of the
 * dead client-side SQL-descriptor stub that never actually ran.
 *
 * Deliberately out of scope for this version: automatically creating a
 * license/asset allocation record when a request is approved. Approving
 * here only records the decision - an administrator still performs the
 * actual allocation (via Licenses/Allocations/Hardware) separately. The
 * legacy SQL's "capacity_exceeded" auto-allocation logic depended on a
 * "license pool with total seats" concept that doesn't exist in the
 * current License model (individual per-seat License rows, not pools).
 */
public class Request
{
    public int Id { get; set; }

    // New License, Reallocation, Release, Temporary License Allocation,
    // Hardware Allocation, Hardware Transfer, Return Hardware
    [Required]
    [MaxLength(40)]
    public string RequestType { get; set; } = "New License";

    [Required]
    public int RequesterId { get; set; }

    public User Requester { get; set; } = null!;

    public int? DepartmentId { get; set; }

    public Department? Department { get; set; }

    // Software being requested (New License / Reallocation / Release /
    // Temporary License Allocation). Not the old "license pool" concept -
    // just the software catalog entry.
    public int? SoftwareId { get; set; }

    public Software? Software { get; set; }

    // Who/what the request is for: User, Computer, Entity, Client.
    [Required]
    [MaxLength(20)]
    public string AllocationType { get; set; } = "User";

    // Set when AllocationType is Computer, or for any hardware request
    // type (Hardware Allocation / Hardware Transfer / Return Hardware).
    public int? AssetId { get; set; }

    public Asset? Asset { get; set; }

    // Set when AllocationType is Entity. "Entity" in the legacy schema
    // maps onto this app's Company model.
    public int? CompanyId { get; set; }

    public Company? Company { get; set; }

    // Set when AllocationType is Client.
    public int? ClientId { get; set; }

    public Client? Client { get; set; }

    // Set when AllocationType is User.
    public int? TargetUserId { get; set; }

    public User? TargetUser { get; set; }

    [MaxLength(1000)]
    public string? Justification { get; set; }

    public DateTime RequestedDate { get; set; } = DateTime.UtcNow.Date;

    public int? DurationDays { get; set; }

    // Pending, Approved, Rejected, Cancelled
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    // Low, Medium, High, Urgent
    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "Medium";

    public DateTime? RequiredFromDate { get; set; }

    public DateTime? RequiredUntilDate { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<RequestApproval> Approvals { get; set; } = new List<RequestApproval>();
}
