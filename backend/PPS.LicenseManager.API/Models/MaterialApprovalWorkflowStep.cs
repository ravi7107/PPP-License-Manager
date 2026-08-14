using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One ordered step within a MaterialApprovalWorkflow. Exactly one of
 * ApproverUserId / ApproverDepartmentId / ApproverRole is expected to be
 * set (validated in the service layer, not the database) - a named user,
 * "whoever heads the requester's department", or "anyone holding this
 * role", respectively. At submit time these steps are materialized into
 * per-movement MaterialMovementApproval rows.
 */
public class MaterialApprovalWorkflowStep
{
    public int Id { get; set; }

    [Required]
    public int WorkflowId { get; set; }
    public MaterialApprovalWorkflow Workflow { get; set; } = null!;

    public int StepOrder { get; set; }

    [MaxLength(50)]
    public string? ApproverRole { get; set; }

    public int? ApproverUserId { get; set; }
    public User? ApproverUser { get; set; }

    public int? ApproverDepartmentId { get; set; }
    public Department? ApproverDepartment { get; set; }

    public bool IsMandatory { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
