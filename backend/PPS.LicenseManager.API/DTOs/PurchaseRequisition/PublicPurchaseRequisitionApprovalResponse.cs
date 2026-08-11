namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

/*
 * Deliberately minimal, read-only view of a PR for the unauthenticated
 * email-link landing page (GET /api/purchase-requisitions/public/{token}).
 * No internal numeric PR id, requester email, attachments, or other
 * approval stages are exposed here - only what an approver needs to make
 * a decision.
 *
 * Fetching this is always side-effect free, even for an expired or
 * already-consumed token - the token is never marked consumed by a GET,
 * only by the POST decision endpoint. That split matters: corporate email
 * security scanners (Microsoft Defender Safe Links, Proofpoint, etc.)
 * routinely pre-fetch every link in an inbound email via GET before the
 * human ever opens it, and if GET could approve/reject a purchase
 * requisition, the scanner - not the approver - would end up deciding it.
 */
public class PublicPurchaseRequisitionApprovalResponse
{
    public string? PrNumber { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Justification { get; set; }
    public string DepartmentName { get; set; } = string.Empty;
    public string RequestedByUserName { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;
    public decimal SubtotalAmount { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }

    public int StepOrder { get; set; }
    public int RequiredApprovalStageCount { get; set; }
    public string ApproverName { get; set; } = string.Empty;

    // Draft, Submitted, InApproval, Approved, Rejected - lets the landing
    // page explain "this was already resolved" without a second call.
    public string PurchaseRequisitionStatus { get; set; } = string.Empty;

    // Pending, Approved, Rejected, Skipped - the specific step this token
    // was issued for.
    public string StepStatus { get; set; } = string.Empty;

    // True once this token has been consumed by a decision (from this
    // link or, less commonly, from the dashboard first) - the landing
    // page hides the Approve/Reject form and shows the outcome instead.
    public bool IsDecided { get; set; }

    public bool IsExpired { get; set; }

    public List<PurchaseRequisitionLineItemResponse> LineItems { get; set; } = new();
}
