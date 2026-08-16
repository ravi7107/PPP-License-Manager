using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class PurchaseRequisitionContactService : IPurchaseRequisitionContactService
{
    private readonly ApplicationDbContext _context;

    public PurchaseRequisitionContactService(ApplicationDbContext context)
    {
        _context = context;
    }

    private static PurchaseRequisitionContactResponse Map(PurchaseRequisitionContact c)
    {
        return new PurchaseRequisitionContactResponse
        {
            Id = c.Id,
            FullName = c.FullName,
            Email = c.Email,
            ContactType = c.ContactType,
            CompanyId = c.CompanyId,
            CompanyName = c.Company != null ? c.Company.Name : null,
            IsActive = c.IsActive,
            CreatedAt = c.CreatedAt
        };
    }

    public async Task<IEnumerable<PurchaseRequisitionContactResponse>> GetAllAsync(
        string? contactType = null,
        bool activeOnly = false)
    {
        var query = _context.PurchaseRequisitionContacts
            .AsNoTracking()
            .Include(c => c.Company)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(contactType))
        {
            // "Both" always counts as either type, matching the submit-
            // flow candidate picker's expectations.
            query = query.Where(c =>
                c.ContactType == contactType || c.ContactType == "Both");
        }

        if (activeOnly)
            query = query.Where(c => c.IsActive);

        return await query
            .OrderBy(c => c.FullName)
            .Select(c => Map(c))
            .ToListAsync();
    }

    public async Task<PurchaseRequisitionContactResponse?> GetByIdAsync(int id)
    {
        var contact = await _context.PurchaseRequisitionContacts
            .AsNoTracking()
            .Include(c => c.Company)
            .FirstOrDefaultAsync(c => c.Id == id);

        return contact == null ? null : Map(contact);
    }

    public async Task<PurchaseRequisitionContactResponse> CreateAsync(
        CreatePurchaseRequisitionContactRequest request,
        int? createdByUserId)
    {
        var email = request.Email.Trim();
        var fullName = request.FullName.Trim();

        if (request.CompanyId.HasValue)
        {
            var companyExists = await _context.Companies
                .AnyAsync(c => c.Id == request.CompanyId.Value && c.IsActive);

            if (!companyExists)
                throw new InvalidOperationException(
                    "Selected company/entity does not exist or is inactive.");
        }

        var duplicateEmail = await _context.PurchaseRequisitionContacts
            .AnyAsync(c => c.Email.ToLower() == email.ToLower() && c.IsActive);

        if (duplicateEmail)
            throw new InvalidOperationException(
                "An active contact with this email already exists.");

        var contact = new PurchaseRequisitionContact
        {
            FullName = fullName,
            Email = email,
            ContactType = request.ContactType,
            CompanyId = request.CompanyId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = createdByUserId
        };

        _context.PurchaseRequisitionContacts.Add(contact);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(contact.Id)
            ?? throw new Exception("Unable to load created contact.");
    }

    public async Task<PurchaseRequisitionContactResponse?> UpdateAsync(
        int id,
        UpdatePurchaseRequisitionContactRequest request)
    {
        var contact = await _context.PurchaseRequisitionContacts
            .FirstOrDefaultAsync(c => c.Id == id);

        if (contact == null)
            return null;

        var email = request.Email.Trim();
        var fullName = request.FullName.Trim();

        if (request.CompanyId.HasValue)
        {
            var companyExists = await _context.Companies
                .AnyAsync(c => c.Id == request.CompanyId.Value && c.IsActive);

            if (!companyExists)
                throw new InvalidOperationException(
                    "Selected company/entity does not exist or is inactive.");
        }

        var duplicateEmail = await _context.PurchaseRequisitionContacts
            .AnyAsync(c =>
                c.Id != id &&
                c.Email.ToLower() == email.ToLower() &&
                c.IsActive);

        if (duplicateEmail)
            throw new InvalidOperationException(
                "An active contact with this email already exists.");

        contact.FullName = fullName;
        contact.Email = email;
        contact.ContactType = request.ContactType;
        contact.CompanyId = request.CompanyId;
        contact.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var contact = await _context.PurchaseRequisitionContacts
            .FirstOrDefaultAsync(c => c.Id == id);

        if (contact == null)
            return false;

        // Soft delete so historical approval steps/PRs referencing this
        // contact keep resolving.
        contact.IsActive = false;

        await _context.SaveChangesAsync();

        return true;
    }
}
