using Microsoft.AspNetCore.Http;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IPurchaseRequisitionService
{
    Task<IEnumerable<PurchaseRequisitionListItemResponse>> GetMineAsync(
        int requestedByUserId);

    Task<PurchaseRequisitionResponse?> GetByIdAsync(
        int id,
        int requestingUserId,
        bool isPrivileged);

    // Available-to-link PR lines for the Asset/License purchase creation
    // forms' optional "link to a Purchase Requisition" picker - see
    // PurchaseRequisitionService's own comment on the implementation.
    Task<List<PurchaseRequisitionAvailableLineResponse>> GetAvailableLinesForLinkingAsync();

    // The audit/reconciliation report - see PurchaseRequisitionService's
    // own comment on the implementation.
    Task<List<PurchaseRequisitionFulfillmentReportRow>> GetFulfillmentReportAsync();

    Task<PurchaseRequisitionResponse> CreateDraftAsync(
        SavePurchaseRequisitionRequest request,
        int requestedByUserId);

    Task<PurchaseRequisitionResponse?> UpdateDraftAsync(
        int id,
        SavePurchaseRequisitionRequest request,
        int requestedByUserId);

    Task<bool> DeleteDraftAsync(
        int id,
        int requestedByUserId,
        string webRootPath);

    Task<PurchaseRequisitionAttachmentResponse> UploadAttachmentAsync(
        int id,
        IFormFile file,
        string attachmentType,
        int uploadedByUserId,
        string webRootPath);

    Task<bool> DeleteAttachmentAsync(
        int id,
        int attachmentId,
        int requestedByUserId,
        string webRootPath);

    Task<PurchaseRequisitionResponse?> SubmitAsync(
        int id,
        SubmitPurchaseRequisitionRequest request,
        int requestedByUserId);

    // Clones an Approved purchase requisition into a new, linked Draft
    // (RevisionNumber + PreviousRevisionId) - see
    // PurchaseRequisitionService.CreateRevisionAsync's comment. Throws
    // InvalidOperationException if the source PR isn't found or isn't
    // Approved.
    Task<PurchaseRequisitionResponse> CreateRevisionAsync(
        int approvedPrId,
        int requestedByUserId);

    Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetApproverCandidatesAsync(int purchaseRequisitionId, int requestingUserId);

    // Contacts (ContactType "Initiator" or "Both") for the optional
    // "Initiated by" picker on the PR create/edit form. Not scoped to a
    // specific PR (no company is known until a Company is picked on the
    // form) - org-wide (CompanyId == null) plus company-scoped contacts
    // for the given company, when provided.
    Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetInitiatorCandidatesAsync(int? companyId);

    Task<IEnumerable<PurchaseRequisitionPendingApprovalResponse>>
        GetPendingApprovalsAsync(int approverUserId);

    Task<PurchaseRequisitionResponse?> DecideStepAsync(
        int id,
        DecidePurchaseRequisitionStepRequest request,
        int decidingUserId,
        string pdfStorageRootPath);


    // =========================================================
    // SECURE EMAIL APPROVAL LINKS (Phase 5)
    // =========================================================

    Task<PublicPurchaseRequisitionApprovalResponse?> GetPublicApprovalViewAsync(
        string rawToken);

    Task<PublicPurchaseRequisitionApprovalResponse?> DecideStepByTokenAsync(
        string rawToken,
        DecidePurchaseRequisitionStepRequest request,
        string pdfStorageRootPath);


    // =========================================================
    // PDF (Phase 6)
    // =========================================================

    // Returns null if the requisition, or its PDF, doesn't exist (e.g. not
    // yet Approved). Throws UnauthorizedAccessException if the caller is
    // neither the owner, a privileged user, nor an assigned approver -
    // same access rule as GetByIdAsync.
    Task<(string PhysicalPath, string FileName)?> GetPdfFileAsync(
        int id,
        int requestingUserId,
        bool isPrivileged,
        string pdfStorageRootPath);


    // =========================================================
    // FINANCE ACTION LINK (Phase 7)
    // =========================================================

    // GET-safe, side-effect-free lookup for the unauthenticated Finance
    // landing page. Returns null only when the token doesn't exist at all
    // - an expired token still returns a response with IsExpired = true.
    Task<PublicPurchaseRequisitionFinanceResponse?> GetPublicFinanceViewAsync(
        string rawToken);

    // Records Finance's PO upload via the secure link - deliberately
    // re-callable (see PurchaseRequisitionFinanceNotification.TokenHash's
    // comment), so a second call simply overwrites the PO details and
    // re-sends the requester their "PO ready" email. Starting with the
    // second call for a given PR, whatever was about to be overwritten is
    // first preserved as a row in PurchaseRequisitionPoUpload, so no
    // revision is ever lost (the very first upload has nothing to
    // preserve yet - it just becomes the header). poDate/poAmount are
    // optional so an already-sent Finance link posting the pre-Phase-6
    // request shape (no PO date/amount fields) still succeeds. Returns
    // null only when the token doesn't exist; throws
    // InvalidOperationException for an expired token, a PR that isn't
    // Approved, or a rejected upload.
    Task<PublicPurchaseRequisitionFinanceResponse?> UploadPoByTokenAsync(
        string rawToken,
        IFormFile file,
        string? poNumber,
        DateTime? poDate,
        decimal? poAmount,
        string pdfStorageRootPath);

    // Authenticated in-app download of whatever PO document Finance most
    // recently uploaded - same access rule as GetPdfFileAsync. Returns
    // null if none has been uploaded yet.
    Task<(string PhysicalPath, string FileName)?> GetPoDocumentFileAsync(
        int id,
        int requestingUserId,
        bool isPrivileged,
        string pdfStorageRootPath);

    // Same access rule as GetPoDocumentFileAsync, but for one specific
    // past upload from PoUploadHistory rather than always "whatever's
    // current" - lets the PR detail view's upload-history list download an
    // older PO copy after a later revision has overwritten the header.
    // Returns null if that history row (or its file) doesn't exist, or
    // doesn't belong to the given purchase requisition.
    Task<(string PhysicalPath, string FileName)?> GetPoUploadHistoryDocumentAsync(
        int purchaseRequisitionId,
        int poUploadId,
        int requestingUserId,
        bool isPrivileged,
        string pdfStorageRootPath);
}
