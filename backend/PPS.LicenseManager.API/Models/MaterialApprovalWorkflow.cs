using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

/*
 * Material Movement Management module - the configurable approval matrix
 * your Purchase Requisition module doesn't have (PR approvers are
 * requester-chosen named individuals per submission, not a matrix). A
 * movement resolves to the highest-Priority (lowest number = evaluated
 * first) active workflow whose MovementType/value range/company pair
 * matches it - see MaterialApprovalWorkflowService.ResolveWorkflow.
 *
 * All matching fields are nullable and treated as "matches anything" when
 * null - e.g. MovementType == null applies to every movement type,
 * MinValue/MaxValue == null means no lower/upper bound.
 */
public class MaterialApprovalWorkflow
{
    public int Id { get; set; }

    [Required]
    [MaxLength(150)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? MovementType { get; set; }

    public decimal? MinValue { get; set; }

    public decimal? MaxValue { get; set; }

    public int? FromCompanyId { get; set; }
    public Company? FromCompany { get; set; }

    public int? ToCompanyId { get; set; }
    public Company? ToCompany { get; set; }

    // Null matches regardless (same "matches anything" convention as
    // MovementType/company pair above). True/false requires the movement
    // to have (or not have) at least one line item carrying a serialized
    // IT asset - see MaterialMovementItem.cs's own comment on AssetId -
    // used to route IT-asset-carrying movements through a different
    // workflow (e.g. via Security) than everything else. See
    // MaterialMovementService.SubmitAsync for where this is evaluated.
    public bool? RequiresItAssetLine { get; set; }

    public bool IsActive { get; set; } = true;

    // Lower evaluates first when more than one workflow matches a
    // movement.
    public int Priority { get; set; } = 100;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<MaterialApprovalWorkflowStep> Steps { get; set; } =
        new List<MaterialApprovalWorkflowStep>();
}
