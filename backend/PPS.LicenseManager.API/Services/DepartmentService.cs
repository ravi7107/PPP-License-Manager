using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Department;
using PPS.LicenseManager.API.Interfaces;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Services;

public class DepartmentService : IDepartmentService
{
    private readonly ApplicationDbContext _context;

    public DepartmentService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<DepartmentResponse>> GetAllAsync()
    {
        return await _context.Departments
            .AsNoTracking()
            .Include(d => d.Company)
            .OrderBy(d => d.DepartmentName)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                CompanyId = d.CompanyId,
                CompanyName = d.Company != null
                    ? d.Company.Name
                    : string.Empty,
                DepartmentCode = d.DepartmentCode,
                DepartmentName = d.DepartmentName,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<DepartmentResponse?> GetByIdAsync(int id)
    {
        return await _context.Departments
            .AsNoTracking()
            .Include(d => d.Company)
            .Where(d => d.Id == id)
            .Select(d => new DepartmentResponse
            {
                Id = d.Id,
                CompanyId = d.CompanyId,
                CompanyName = d.Company != null
                    ? d.Company.Name
                    : string.Empty,
                DepartmentCode = d.DepartmentCode,
                DepartmentName = d.DepartmentName,
                Description = d.Description,
                IsActive = d.IsActive,
                CreatedAt = d.CreatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<DepartmentResponse> CreateAsync(
        CreateDepartmentRequest request)
    {
        var companyExists = await _context.Companies
            .AnyAsync(c => c.Id == request.CompanyId && c.IsActive);

        if (!companyExists)
            throw new InvalidOperationException(
                "Selected company/entity does not exist or is inactive.");

        var code = request.DepartmentCode.Trim();
        var name = request.DepartmentName.Trim();

        var duplicateCode = await _context.Departments
            .AnyAsync(d =>
                d.CompanyId == request.CompanyId &&
                d.DepartmentCode.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Department code already exists for this entity.");

        var department = new Department
        {
            CompanyId = request.CompanyId,
            DepartmentCode = code,
            DepartmentName = name,
            Description = string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Departments.Add(department);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(department.Id)
            ?? throw new Exception(
                "Unable to load created department.");
    }

    public async Task<DepartmentResponse?> UpdateAsync(
        int id,
        UpdateDepartmentRequest request)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            return null;

        var companyExists = await _context.Companies
            .AnyAsync(c => c.Id == request.CompanyId && c.IsActive);

        if (!companyExists)
            throw new InvalidOperationException(
                "Selected company/entity does not exist or is inactive.");

        var code = request.DepartmentCode.Trim();
        var name = request.DepartmentName.Trim();

        var duplicateCode = await _context.Departments
            .AnyAsync(d =>
                d.Id != id &&
                d.CompanyId == request.CompanyId &&
                d.DepartmentCode.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Department code already exists for this entity.");

        department.CompanyId = request.CompanyId;
        department.DepartmentCode = code;
        department.DepartmentName = name;
        department.Description =
            string.IsNullOrWhiteSpace(request.Description)
                ? null
                : request.Description.Trim();
        department.IsActive = request.IsActive;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(d => d.Id == id);

        if (department == null)
            return false;

        // Soft delete so historical records remain intact.
        department.IsActive = false;

        await _context.SaveChangesAsync();

        return true;
    }
}
