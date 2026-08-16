namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MaterialMovementResponse
{
    public int Id { get; set; }

    // Null while Draft - assigned on submit.
    public string? MovementNumber { get; set; }

    public string MovementType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;

    // Which approval step is currently awaiting a decision - null before
    // submit and after the movement reaches a terminal approval state.
    public int? CurrentApprovalStepOrder { get; set; }

    public int? FromCompanyId { get; set; }
    public string? FromCompanyName { get; set; }
    public int? FromLocationId { get; set; }
    public string? FromLocationName { get; set; }
    public int? FromDepartmentId { get; set; }
    public string? FromDepartmentName { get; set; }
    public int? FromCostCenterId { get; set; }
    public string? FromCostCenterName { get; set; }

    public int? ToCompanyId { get; set; }
    public string? ToCompanyName { get; set; }
    public int? ToLocationId { get; set; }
    public string? ToLocationName { get; set; }
    public int? ToDepartmentId { get; set; }
    public string? ToDepartmentName { get; set; }
    public int? ToCostCenterId { get; set; }
    public string? ToCostCenterName { get; set; }

    public int? VendorId { get; set; }
    public string? VendorName { get; set; }

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;
    public DateTime RequestedAt { get; set; }

    public DateTime? ExpectedReturnDate { get; set; }

    public string? Purpose { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    public List<MaterialMovementItemResponse> Items { get; set; } = new();

    // Empty before submit. Ordered by StepOrder.
    public List<MaterialMovementApprovalResponse> Approvals { get; set; } = new();

    // Null until the movement is Dispatched.
    public MaterialMovementDispatchResponse? Dispatch { get; set; }
}
