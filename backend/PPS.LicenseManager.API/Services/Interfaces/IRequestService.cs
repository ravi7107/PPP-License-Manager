using PPS.LicenseManager.API.DTOs.Request;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IRequestService
{
    Task<IEnumerable<RequestResponse>> GetAllAsync(int? requesterId, string? status);

    Task<RequestResponse?> GetByIdAsync(int id);

    Task<RequestResponse> CreateAsync(CreateRequestRequest request);

    Task<RequestResponse?> CancelAsync(int id, int actorUserId);

    Task<RequestResponse?> ApproveAsync(int id, DecideRequestRequest request);

    Task<RequestResponse?> RejectAsync(int id, DecideRequestRequest request);

    Task<IEnumerable<RequestApprovalResponse>> GetApprovalHistoryAsync(int requestId);
}
