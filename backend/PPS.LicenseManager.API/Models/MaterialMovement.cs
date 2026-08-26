using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - the header of a FROM -> TO
 * material movement transaction. Modeled closely on PurchaseRequisition
 * (header + line items + approval steps + attachments + audit log), with
 * movement-specific additions (dispatch/receipt/return) living in their
 * own tables since not every movement type reaches every one of those
 * stages (e.g. a Draft never dispatches; a non-Temporary movement never
 * returns).
 *
 * MovementType: InternalTransfer, InterEntityTransfer, OutwardToVendor,
 * InwardFromVendor, TemporaryMovement, DirectInward, DirectOutward.
 *
 * Status: Draft, Submitted, PendingApproval, Approved, AwaitingTransfer,
 * Dispatched, InTransit, Received, Completed, Rejected, Cancelled,
 * TemporaryReturnPending, TemporaryReturned.
 *
 * AwaitingTransfer (Phase 4 of the QR-driven material movement plan): set
 * the moment final approval clears, instead of "Approved" - a gate pass
 * (with QR) is auto-generated at that same moment (see
 * MaterialMovementService.DecideAsync), but the movement isn't physically
 * "Dispatched" yet. "Approved" is no longer reachable for movements
 * approved after this shipped - it's kept only because movements already
 * sitting at "Approved" when this deployed still need to dispatch via the
 * pre-existing manual Dispatch action/endpoint, which is left untouched.
 *
 * FROM/TO fields are all nullable because which ones apply depends on
 * MovementType - e.g. OutwardToVendor has a FROM location but no TO
 * company/location (VendorId is used instead), DirectInward has no FROM
 * side at all. Validated per-type in the service layer, not the database.
 */
public class MaterialMovement
{
    public int Id { get; set; }

    // Auto-generated on submit (e.g. "MAT-2026-000001"); null while Draft.
    [MaxLength(30)]
    public string? MovementNumber { get; set; }

    [Required]
    [MaxLength(30)]
    public string MovementType { get; set; } = string.Empty;

    [Required]
    [MaxLength(30)]
    public string Status { get; set; } = "Draft";

    public int? FromCompanyId { get; set; }
    public Company? FromCompany { get; set; }

    public int? FromLocationId { get; set; }
    public OfficeLocation? FromLocation { get; set; }

    public int? FromDepartmentId { get; set; }
    public Department? FromDepartment { get; set; }

    public int? FromCostCenterId { get; set; }
    public MaterialCostCenter? FromCostCenter { get; set; }

    public int? ToCompanyId { get; set; }
    public Company? ToCompany { get; set; }

    public int? ToLocationId { get; set; }
    public OfficeLocation? ToLocation { get; set; }

    public int? ToDepartmentId { get; set; }
    public Department? ToDepartment { get; set; }

    public int? ToCostCenterId { get; set; }
    public MaterialCostCenter? ToCostCenter { get; set; }

    // Used by OutwardToVendor / InwardFromVendor instead of a To/From
    // company+location pair.
    public int? VendorId { get; set; }
    public Vendor? Vendor { get; set; }

    [Required]
    public int RequestedByUserId { get; set; }
    public User RequestedByUser { get; set; } = null!;

    public DateTime RequestedAt { get; set; } = DateTime.UtcNow;

    // Only meaningful for MovementType == "TemporaryMovement".
    public DateTime? ExpectedReturnDate { get; set; }

    // Resolved once, at submit time, from MaterialApprovalWorkflowService -
    // which active MaterialApprovalWorkflow matched this movement's type/
    // value/company. Null while Draft.
    public int? ApprovalWorkflowId { get; set; }
    public MaterialApprovalWorkflow? ApprovalWorkflow { get; set; }

    // Which approval step is currently awaiting a decision. Null before
    // submit and after the movement reaches a terminal approval state.
    public int? CurrentApprovalStepOrder { get; set; }

    public string? Purpose { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<MaterialMovementItem> Items { get; set; } =
        new List<MaterialMovementItem>();

    public ICollection<MaterialMovementApproval> Approvals { get; set; } =
        new List<MaterialMovementApproval>();

    public ICollection<MaterialMovementAttachment> Attachments { get; set; } =
        new List<MaterialMovementAttachment>();
}
