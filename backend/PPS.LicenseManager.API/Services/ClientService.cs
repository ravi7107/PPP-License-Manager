using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Client;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class ClientService : IClientService
{
    private readonly ApplicationDbContext _context;

    public ClientService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<ClientResponse>> GetAllAsync()
    {
        return await _context.Clients
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new ClientResponse
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                ContactName = c.ContactName,
                ContactEmail = c.ContactEmail,
                ContactPhone = c.ContactPhone,
                Address = c.Address,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                LicensePurchaseCount = c.LicensePurchases.Count()
            })
            .ToListAsync();
    }

    public async Task<ClientResponse?> GetByIdAsync(int id)
    {
        return await _context.Clients
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new ClientResponse
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                ContactName = c.ContactName,
                ContactEmail = c.ContactEmail,
                ContactPhone = c.ContactPhone,
                Address = c.Address,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                LicensePurchaseCount = c.LicensePurchases.Count()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<ClientResponse> CreateAsync(
        CreateClientRequest request)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var duplicateCode = await _context.Clients
            .AnyAsync(c =>
                c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Client code already exists.");

        var client = new Client
        {
            Name = name,
            Code = code,
            ContactName =
                string.IsNullOrWhiteSpace(request.ContactName)
                    ? null
                    : request.ContactName.Trim(),
            ContactEmail =
                string.IsNullOrWhiteSpace(request.ContactEmail)
                    ? null
                    : request.ContactEmail.Trim(),
            ContactPhone =
                string.IsNullOrWhiteSpace(request.ContactPhone)
                    ? null
                    : request.ContactPhone.Trim(),
            Address =
                string.IsNullOrWhiteSpace(request.Address)
                    ? null
                    : request.Address.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Clients.Add(client);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(client.Id)
            ?? throw new Exception(
                "Unable to load created client.");
    }

    public async Task<ClientResponse?> UpdateAsync(
        int id,
        UpdateClientRequest request)
    {
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return null;

        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var duplicateCode = await _context.Clients
            .AnyAsync(c =>
                c.Id != id &&
                c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Client code already exists.");

        client.Name = name;
        client.Code = code;

        client.ContactName =
            string.IsNullOrWhiteSpace(request.ContactName)
                ? null
                : request.ContactName.Trim();

        client.ContactEmail =
            string.IsNullOrWhiteSpace(request.ContactEmail)
                ? null
                : request.ContactEmail.Trim();

        client.ContactPhone =
            string.IsNullOrWhiteSpace(request.ContactPhone)
                ? null
                : request.ContactPhone.Trim();

        client.Address =
            string.IsNullOrWhiteSpace(request.Address)
                ? null
                : request.Address.Trim();

        client.IsActive = request.IsActive;
        client.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var client = await _context.Clients
            .FirstOrDefaultAsync(c => c.Id == id);

        if (client == null)
            return false;

        // Soft delete to preserve historical license records.
        client.IsActive = false;
        client.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
