using Microsoft.AspNetCore.Http;
using PPS.LicenseManager.API.DTOs.Utilization;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IUtilizationUploadService
{
    Task<List<UtilizationUploadBatchResponse>> GetAllAsync();

    Task<UtilizationUploadBatchResponse> UploadAsync(
        IFormFile file,
        UploadUtilizationBatchRequest request,
        int actorUserId,
        string storageRootPath);

    Task<UtilizationUploadPreviewResponse> GetPreviewAsync(int batchId);

    Task<UtilizationUploadBatchResponse> SaveMappingAsync(
        int batchId,
        SaveUtilizationMappingRequest request,
        int actorUserId);

    Task<UtilizationProcessResultResponse> ProcessAsync(int batchId, int actorUserId);

    Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(
        int batchId, string storageRootPath);

    Task DeactivateAsync(int batchId, int actorUserId);

    Task<List<UtilizationMappingProfileResponse>> GetMappingProfilesAsync();
}
