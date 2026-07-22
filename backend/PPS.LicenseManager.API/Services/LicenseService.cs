using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.License;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class LicenseService : ILicenseService
{
    private readonly ApplicationDbContext _context;

    public LicenseService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LicenseResponse>> GetAllAsync()
    {
        return await _context.Licenses
            .Include(l => l.Software)
            .Select(l => new LicenseResponse
            {
                Id = l.Id,
                AliasCode = l.AliasCode,
                SoftwareId = l.SoftwareId,
                SoftwareName = l.Software.Name,
                LicensedEmail = l.LicensedEmail,
                SubscriptionId = l.SubscriptionId,
                Status = l.Status,
                AllowTemporaryCheckout = l.AllowTemporaryCheckout,
                MaxCheckoutDays = l.MaxCheckoutDays,
                PurchaseDate = l.PurchaseDate,
                ExpiryDate = l.ExpiryDate,
                PurchaseCost = l.PurchaseCost,
                Remarks = l.Remarks,
                IsActive = l.IsActive
            })
            .ToListAsync();
    }

    public async Task<LicenseResponse?> GetByIdAsync(int id)
    {
        var license = await _context.Licenses
            .Include(l => l.Software)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (license == null)
            return null;

        return new LicenseResponse
        {
            Id = license.Id,
            AliasCode = license.AliasCode,
            SoftwareId = license.SoftwareId,
            SoftwareName = license.Software.Name,
            LicensedEmail = license.LicensedEmail,
            SubscriptionId = license.SubscriptionId,
            Status = license.Status,
            AllowTemporaryCheckout = license.AllowTemporaryCheckout,
            MaxCheckoutDays = license.MaxCheckoutDays,
            PurchaseDate = license.PurchaseDate,
            ExpiryDate = license.ExpiryDate,
            PurchaseCost = license.PurchaseCost,
            Remarks = license.Remarks,
            IsActive = license.IsActive
        };
    }

    public async Task<LicenseResponse> CreateAsync(CreateLicenseRequest request)
    {
        var software = await _context.Software.FindAsync(request.SoftwareId);

        if (software == null)
            throw new InvalidOperationException("Software not found.");

        var license = new License
        {
            AliasCode = request.AliasCode,
            SoftwareId = request.SoftwareId,
            LicensedEmail = request.LicensedEmail,
            SubscriptionId = request.SubscriptionId,
            Status = "Available",
            AllowTemporaryCheckout = request.AllowTemporaryCheckout,
            MaxCheckoutDays = request.MaxCheckoutDays,
            PurchaseDate = request.PurchaseDate,
            ExpiryDate = request.ExpiryDate,
            PurchaseCost = request.PurchaseCost,
            Remarks = request.Remarks,
            IsActive = true
        };

        _context.Licenses.Add(license);
        await _context.SaveChangesAsync();

        var createdLicense = await GetByIdAsync(license.Id);

        if (createdLicense == null)
        {
            throw new InvalidOperationException("License was created but could not be retrieved.");
        }

        return createdLicense;
    }

    public async Task<bool> UpdateAsync(int id, UpdateLicenseRequest request)
    {
        var license = await _context.Licenses.FindAsync(id);

        if (license == null)
            return false;

        var software = await _context.Software.FindAsync(request.SoftwareId);

        if (software == null)
            throw new InvalidOperationException("Software not found.");

        license.AliasCode = request.AliasCode;
        license.SoftwareId = request.SoftwareId;
        license.LicensedEmail = request.LicensedEmail;
        license.SubscriptionId = request.SubscriptionId;
        license.Status = request.Status;
        license.AllowTemporaryCheckout = request.AllowTemporaryCheckout;
        license.MaxCheckoutDays = request.MaxCheckoutDays;
        license.PurchaseDate = request.PurchaseDate;
        license.ExpiryDate = request.ExpiryDate;
        license.PurchaseCost = request.PurchaseCost;
        license.Remarks = request.Remarks;
        license.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var license = await _context.Licenses.FindAsync(id);

        if (license == null)
            return false;

        _context.Licenses.Remove(license);

        await _context.SaveChangesAsync();

        return true;
    }
}
