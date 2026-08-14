using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;

/*
 * One ordered step in an approval workflow. ApproverType selects which of
 * the three approver fields below is used - exactly one must be set,
 * matching the ApproverType, validated in
 * MaterialApprovalWorkflowService.ValidateStep:
 *
 *   "Role"       -> ApproverRole (anyone holding this role, e.g. "IT Admin")
 *   "User"       -> ApproverUserId (one named person)
 *   "Department" -> ApproverDepartmentId (whoever heads that department)
 *
 * StepOrder is not accepted here - the service assigns it from each step's
 * position in the Steps list (1-based), the same "no reorder UI, order =
 * array position" convention Purchase Requisition line items use.
 */
public class MaterialApprovalWorkflowStepRequest
{
    [Required]
    [StringLength(20)]
    public string ApproverType { get; set; } = string.Empty;

    [StringLength(50)]
    public string? ApproverRole { get; set; }

    public int? ApproverUserId { get; set; }

    public int? ApproverDepartmentId { get; set; }

    public bool IsMandatory { get; set; } = true;
}
