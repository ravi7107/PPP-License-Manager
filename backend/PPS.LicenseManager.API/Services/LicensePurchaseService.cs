using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.LicensePurchase;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class LicensePurchaseService : ILicensePurchaseService
{
    private readonly ApplicationDbContext _context;

    public LicensePurchaseService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LicensePurchaseResponse>> GetAllAsync(
        bool isEntityRestricted = false,
        int? companyId = null)
    {
        // A Team Lead/Manager with no Entity assigned yet sees nothing.
        if (isEntityRestricted && companyId == null)
        {
            return new List<LicensePurchaseResponse>();
        }

        var query = _context.LicensePurchases.AsNoTracking();

        if (isEntityRestricted)
        {
            // Own entity's purchases, plus purchases with no CompanyId
            // at all (organization-wide, or client-billed work that
            // isn't tied to any one PPS entity) - only purchases
            // confirmed to belong to a DIFFERENT entity are hidden.
            query = query.Where(p =>
                p.CompanyId == null || p.CompanyId == companyId);
        }

        return await query
            .Select(p => new LicensePurchaseResponse
            {
                Id = p.Id,
                SoftwareId = p.SoftwareId,
                SoftwareName = p.Software.Name,
                Vendor = p.Vendor,
                LicenseType = p.LicenseType,
                LicenseKey = p.LicenseKey,
                TotalLicenses = p.TotalLicenses,

                CreatedLicenses = p.Licenses.Count(l => l.IsActive),

                AvailableLicenses =
                    p.TotalLicenses -
                    p.Licenses.Count(l => l.IsActive),

                PurchaseDate = p.PurchaseDate,
                ExpiryDate = p.ExpiryDate,
                SupportExpiryDate = p.SupportExpiryDate,

                CompanyId = p.CompanyId,
                CompanyName = p.Company != null
                    ? p.Company.Name
                    : null,

                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null
                    ? p.Department.DepartmentName
                    : null,

                ClientId = p.ClientId,
                ClientName = p.Client != null
                    ? p.Client.Name
                    : null,

                PurchasedByType = p.PurchasedByType,
                PurchaseScope = p.PurchaseScope,
                PONumber = p.PONumber,
                InvoiceNumber = p.InvoiceNumber,
                ContractNumber = p.ContractNumber,
                Cost = p.Cost,
                Currency = p.Currency,
                PurchaseSource = p.PurchaseSource,
                Remarks = p.Remarks,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .OrderByDescending(p => p.Id)
            .ToListAsync();
    }

    public async Task<LicensePurchaseResponse?> GetByIdAsync(int id)
    {
        return await _context.LicensePurchases
            .AsNoTracking()
            .Where(p => p.Id == id)
            .Select(p => new LicensePurchaseResponse
            {
                Id = p.Id,
                SoftwareId = p.SoftwareId,
                SoftwareName = p.Software.Name,
                Vendor = p.Vendor,
                LicenseType = p.LicenseType,
                LicenseKey = p.LicenseKey,
                TotalLicenses = p.TotalLicenses,

                CreatedLicenses = p.Licenses.Count(l => l.IsActive),

                AvailableLicenses =
                    p.TotalLicenses -
                    p.Licenses.Count(l => l.IsActive),

                PurchaseDate = p.PurchaseDate,
                ExpiryDate = p.ExpiryDate,
                SupportExpiryDate = p.SupportExpiryDate,

                CompanyId = p.CompanyId,
                CompanyName = p.Company != null
                    ? p.Company.Name
                    : null,

                DepartmentId = p.DepartmentId,
                DepartmentName = p.Department != null
                    ? p.Department.DepartmentName
                    : null,

                ClientId = p.ClientId,
                ClientName = p.Client != null
                    ? p.Client.Name
                    : null,

                PurchasedByType = p.PurchasedByType,
                PurchaseScope = p.PurchaseScope,
                PONumber = p.PONumber,
                InvoiceNumber = p.InvoiceNumber,
                ContractNumber = p.ContractNumber,
                Cost = p.Cost,
                Currency = p.Currency,
                PurchaseSource = p.PurchaseSource,
                Remarks = p.Remarks,
                IsActive = p.IsActive,
                CreatedAt = p.CreatedAt,
                UpdatedAt = p.UpdatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<LicensePurchaseResponse> CreateAsync(
        CreateLicensePurchaseRequest request)
    {
        ValidatePurchasedBy(
            request.PurchasedByType,
            request.CompanyId,
            request.ClientId);

        await ValidateReferencesAsync(
            request.SoftwareId,
            request.CompanyId,
            request.DepartmentId,
            request.ClientId);

        ValidateDates(
            request.PurchaseDate,
            request.ExpiryDate,
            request.SupportExpiryDate);

        var purchase = new LicensePurchase
        {
            SoftwareId = request.SoftwareId,
            Vendor = request.Vendor.Trim(),
            LicenseType = request.LicenseType.Trim(),
            LicenseKey = Normalize(request.LicenseKey),
            TotalLicenses = request.TotalLicenses,
            PurchaseDate = request.PurchaseDate,
            ExpiryDate = request.ExpiryDate,
            SupportExpiryDate = request.SupportExpiryDate,
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            ClientId = request.ClientId,
            PurchasedByType = NormalizePurchasedByType(
                request.PurchasedByType),
            PurchaseScope = request.PurchaseScope.Trim(),
            PONumber = Normalize(request.PONumber),
            InvoiceNumber = Normalize(request.InvoiceNumber),
            ContractNumber = Normalize(request.ContractNumber),
            Cost = request.Cost,
            Currency = Normalize(request.Currency),
            PurchaseSource = Normalize(request.PurchaseSource),
            Remarks = Normalize(request.Remarks),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.LicensePurchases.Add(purchase);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(purchase.Id)
            ?? throw new InvalidOperationException(
                "License purchase was created but could not be retrieved.");
    }

    public async Task<bool> UpdateAsync(
        int id,
        UpdateLicensePurchaseRequest request)
    {
        var purchase = await _context.LicensePurchases
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase == null)
            return false;

        ValidatePurchasedBy(
            request.PurchasedByType,
            request.CompanyId,
            request.ClientId);

        await ValidateReferencesAsync(
            request.SoftwareId,
            request.CompanyId,
            request.DepartmentId,
            request.ClientId);

        ValidateDates(
            request.PurchaseDate,
            request.ExpiryDate,
            request.SupportExpiryDate);

        var createdLicenses = await _context.Licenses
            .CountAsync(l =>
                l.LicensePurchaseId == id &&
                l.IsActive);

        if (request.TotalLicenses < createdLicenses)
        {
            throw new InvalidOperationException(
                $"Total licenses cannot be reduced below {createdLicenses} because that many active licenses already exist.");
        }

        /*
         * Once licenses exist under a purchase, changing the software
         * would make those licenses inconsistent with their purchase.
         */
        if (purchase.SoftwareId != request.SoftwareId &&
            createdLicenses > 0)
        {
            throw new InvalidOperationException(
                "Software cannot be changed because licenses already exist under this purchase.");
        }

        purchase.SoftwareId = request.SoftwareId;
        purchase.Vendor = request.Vendor.Trim();
        purchase.LicenseType = request.LicenseType.Trim();
        purchase.LicenseKey = Normalize(request.LicenseKey);
        purchase.TotalLicenses = request.TotalLicenses;
        purchase.PurchaseDate = request.PurchaseDate;
        purchase.ExpiryDate = request.ExpiryDate;
        purchase.SupportExpiryDate = request.SupportExpiryDate;
        purchase.CompanyId = request.CompanyId;
        purchase.DepartmentId = request.DepartmentId;
        purchase.ClientId = request.ClientId;
        purchase.PurchasedByType = NormalizePurchasedByType(
            request.PurchasedByType);
        purchase.PurchaseScope = request.PurchaseScope.Trim();
        purchase.PONumber = Normalize(request.PONumber);
        purchase.InvoiceNumber = Normalize(request.InvoiceNumber);
        purchase.ContractNumber = Normalize(request.ContractNumber);
        purchase.Cost = request.Cost;
        purchase.Currency = Normalize(request.Currency);
        purchase.PurchaseSource = Normalize(request.PurchaseSource);
        purchase.Remarks = Normalize(request.Remarks);
        purchase.IsActive = request.IsActive;
        purchase.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var purchase = await _context.LicensePurchases
            .FirstOrDefaultAsync(p => p.Id == id);

        if (purchase == null)
            return false;

        var hasLicenses = await _context.Licenses
            .AnyAsync(l => l.LicensePurchaseId == id);

        if (hasLicenses)
        {
            throw new InvalidOperationException(
                "This purchase cannot be deleted because licenses are linked to it. Mark it inactive instead.");
        }

        _context.LicensePurchases.Remove(purchase);

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task ValidateReferencesAsync(
        int softwareId,
        int? companyId,
        int? departmentId,
        int? clientId)
    {
        var softwareExists = await _context.Software
            .AnyAsync(s =>
                s.Id == softwareId &&
                s.IsActive);

        if (!softwareExists)
        {
            throw new InvalidOperationException(
                "Selected software does not exist or is inactive.");
        }

        if (companyId.HasValue)
        {
            var companyExists = await _context.Companies
                .AnyAsync(c =>
                    c.Id == companyId.Value &&
                    c.IsActive);

            if (!companyExists)
            {
                throw new InvalidOperationException(
                    "Selected entity does not exist or is inactive.");
            }
        }

        if (departmentId.HasValue)
        {
            var department = await _context.Departments
                .AsNoTracking()
                .FirstOrDefaultAsync(d =>
                    d.Id == departmentId.Value &&
                    d.IsActive);

            if (department == null)
            {
                throw new InvalidOperationException(
                    "Selected department does not exist or is inactive.");
            }

            if (!companyId.HasValue)
            {
                throw new InvalidOperationException(
                    "An internal entity must be selected when a department is selected.");
            }

            if (department.CompanyId != companyId.Value)
            {
                throw new InvalidOperationException(
                    "Selected department does not belong to the selected entity.");
            }
        }

        if (clientId.HasValue)
        {
            var clientExists = await _context.Clients
                .AnyAsync(c =>
                    c.Id == clientId.Value &&
                    c.IsActive);

            if (!clientExists)
            {
                throw new InvalidOperationException(
                    "Selected client does not exist or is inactive.");
            }
        }
    }

    private static void ValidateDates(
        DateOnly purchaseDate,
        DateOnly? expiryDate,
        DateOnly? supportExpiryDate)
    {
        if (expiryDate.HasValue &&
            expiryDate.Value < purchaseDate)
        {
            throw new InvalidOperationException(
                "Expiry date cannot be earlier than purchase date.");
        }

        if (supportExpiryDate.HasValue &&
            supportExpiryDate.Value < purchaseDate)
        {
            throw new InvalidOperationException(
                "Support expiry date cannot be earlier than purchase date.");
        }
    }

    private static void ValidatePurchasedBy(
        string purchasedByType,
        int? companyId,
        int? clientId)
    {
        var normalized =
            NormalizePurchasedByType(purchasedByType);

        if (normalized == "Entity" &&
            !companyId.HasValue)
        {
            throw new InvalidOperationException(
                "Entity is required when Purchased By is Entity.");
        }

        if (normalized == "Client" &&
            !clientId.HasValue)
        {
            throw new InvalidOperationException(
                "Client is required when Purchased By is Client.");
        }
    }

    private static string NormalizePurchasedByType(
        string? value)
    {
        if (string.Equals(
                value,
                "Entity",
                StringComparison.OrdinalIgnoreCase))
        {
            return "Entity";
        }

        if (string.Equals(
                value,
                "Client",
                StringComparison.OrdinalIgnoreCase))
        {
            return "Client";
        }

        throw new InvalidOperationException(
            "Purchased By must be either Entity or Client.");
    }

    private static string? Normalize(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
