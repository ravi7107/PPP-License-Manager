using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Company;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class CompanyService : ICompanyService
{
    private readonly ApplicationDbContext _context;

    public CompanyService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<CompanyResponse>> GetAllAsync()
    {
        return await _context.Companies
            .OrderBy(c => c.Name)
            .Select(c => new CompanyResponse
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                GSTNumber = c.GSTNumber,
                Address = c.Address,
                ContactPerson = c.ContactPerson,
                ContactEmail = c.ContactEmail,
                ContactPhone = c.ContactPhone,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<CompanyResponse?> GetByIdAsync(int id)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
            return null;

        return new CompanyResponse
        {
            Id = company.Id,
            Name = company.Name,
            Code = company.Code,
            GSTNumber = company.GSTNumber,
            Address = company.Address,
            ContactPerson = company.ContactPerson,
            ContactEmail = company.ContactEmail,
            ContactPhone = company.ContactPhone,
            IsActive = company.IsActive,
            CreatedAt = company.CreatedAt,
            UpdatedAt = company.UpdatedAt
        };
    }

    public async Task<CompanyResponse> CreateAsync(CreateCompanyRequest request)
    {
        var exists = await _context.Companies
            .AnyAsync(c => c.Name == request.Name);

        if (exists)
            throw new InvalidOperationException("Company already exists.");

        var company = new Company
        {
            Name = request.Name,
            Code = request.Code,
            GSTNumber = request.GSTNumber,
            Address = request.Address,
            ContactPerson = request.ContactPerson,
            ContactEmail = request.ContactEmail,
            ContactPhone = request.ContactPhone,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Companies.Add(company);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(company.Id)
            ?? throw new Exception("Unable to load created company.");
    }

    public async Task<CompanyResponse?> UpdateAsync(int id, UpdateCompanyRequest request)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
            return null;

        company.Name = request.Name;
        company.Code = request.Code;
        company.GSTNumber = request.GSTNumber;
        company.Address = request.Address;
        company.ContactPerson = request.ContactPerson;
        company.ContactEmail = request.ContactEmail;
        company.ContactPhone = request.ContactPhone;
        company.IsActive = request.IsActive;
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(c => c.Id == id);

        if (company == null)
            return false;

        company.IsActive = false;
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
