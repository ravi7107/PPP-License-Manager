using PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IMaterialApprovalWorkflowService
{
    Task<IEnumerable<MaterialApprovalWorkflowResponse>> GetAllAsync();

    Task<MaterialApprovalWorkflowResponse?> GetByIdAsync(int id);

    Task<MaterialApprovalWorkflowResponse> CreateAsync(
        CreateMaterialApprovalWorkflowRequest request);

    Task<MaterialApprovalWorkflowResponse?> UpdateAsync(
        int id,
        UpdateMaterialApprovalWorkflowRequest request);

    Task<bool> DeleteAsync(int id);
}
