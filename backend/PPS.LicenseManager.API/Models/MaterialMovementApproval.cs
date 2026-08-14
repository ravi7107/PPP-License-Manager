using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * One resolved approval step instance for a specific movement, materialized
 * from MaterialApprovalWorkflowStep at submit time. Status: Pending,
 * Approved, Rejected, Skipped ("Skipped" covers a step whose
 * ApproverDepartmentId/ApproverRole couldn't resolve to anyone and
 * IsMandatory was false on the source step).
 */
public class MaterialMovementApproval
{
    public int Id { get; set; }

    [Required]
    public int MovementId { get; set; }
    public MaterialMovement Movement { get; set; } = null!;

    public int StepOrder { get; set; }

    public int? ApproverUserId { get; set; }
    public User? ApproverUser { get; set; }

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "Pending";

    public DateTime? ActionedAt { get; set; }

    [MaxLength(500)]
    public string? Comments { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
