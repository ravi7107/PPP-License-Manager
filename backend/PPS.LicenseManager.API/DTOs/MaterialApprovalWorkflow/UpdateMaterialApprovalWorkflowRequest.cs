using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;

public class UpdateMaterialApprovalWorkflowRequest
{
    [Required]
    [StringLength(150)]
    public string Name { get; set; } = string.Empty;

    [StringLength(30)]
    public string? MovementType { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Minimum value cannot be negative.")]
    public decimal? MinValue { get; set; }

    [Range(0, double.MaxValue, ErrorMessage = "Maximum value cannot be negative.")]
    public decimal? MaxValue { get; set; }

    public int? FromCompanyId { get; set; }

    public int? ToCompanyId { get; set; }

    // Null matches regardless; true/false requires the movement to (not)
    // carry a line item linked to a serialized IT asset.
    public bool? RequiresItAssetLine { get; set; }

    public int Priority { get; set; } = 100;

    public bool IsActive { get; set; }

    [Required]
    [MinLength(1, ErrorMessage = "A workflow must have at least one approval step.")]
    public List<MaterialApprovalWorkflowStepRequest> Steps { get; set; } = new();
}
