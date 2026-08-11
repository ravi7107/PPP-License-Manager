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

    Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetApproverCandidatesAsync(int requestingUserId);
}
