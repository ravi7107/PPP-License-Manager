namespace PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;

public class MaterialApprovalWorkflowResponse
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? MovementType { get; set; }
    public decimal? MinValue { get; set; }
    public decimal? MaxValue { get; set; }

    public int? FromCompanyId { get; set; }
    public string? FromCompanyName { get; set; }

    public int? ToCompanyId { get; set; }
    public string? ToCompanyName { get; set; }

    public bool? RequiresItAssetLine { get; set; }

    public bool IsActive { get; set; }
    public int Priority { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<MaterialApprovalWorkflowStepResponse> Steps { get; set; } = new();
}
