using PPS.LicenseManager.API.DTOs.Client;

namespace PPS.LicenseManager.API.Interfaces;

public interface IClientService
{
    Task<IEnumerable<ClientResponse>> GetAllAsync();

    Task<ClientResponse?> GetByIdAsync(int id);

    Task<ClientResponse> CreateAsync(
        CreateClientRequest request);

    Task<ClientResponse?> UpdateAsync(
        int id,
        UpdateClientRequest request);

    Task<bool> DeleteAsync(int id);
}
