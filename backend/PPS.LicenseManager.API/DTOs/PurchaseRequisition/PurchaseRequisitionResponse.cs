namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionResponse
{
    public int Id { get; set; }

    // Null while Draft - assigned on Submit.
    public string? PrNumber { get; set; }

    public int CompanyId { get; set; }
    public string? CompanyName { get; set; }

    public int DepartmentId { get; set; }
    public string DepartmentName { get; set; } = string.Empty;

    // Optional - null when no vendor has been selected for this PR yet.
    public int? VendorId { get; set; }
    public string? VendorName { get; set; }

    public int RequestedByUserId { get; set; }
    public string RequestedByUserName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;
    public string? Justification { get; set; }

    // Draft, Submitted, InApproval, Approved, Rejected
    public string Status { get; set; } = string.Empty;

    public int RequiredApprovalStageCount { get; set; }
    public int? CurrentApprovalStepOrder { get; set; }

    public string Currency { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? RejectedAt { get; set; }

    public string? PdfPath { get; set; }
    public DateTime? PdfGeneratedAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }

    // Whether the caller is the owner - drives which actions the frontend
    // shows (Edit/Submit/Delete are owner-only, and only while Draft).
    public bool IsOwner { get; set; }

    public List<PurchaseRequisitionLineItemResponse> LineItems { get; set; } = new();
    public List<PurchaseRequisitionAttachmentResponse> Attachments { get; set; } = new();
    public List<PurchaseRequisitionApprovalStepResponse> ApprovalSteps { get; set; } = new();
}
