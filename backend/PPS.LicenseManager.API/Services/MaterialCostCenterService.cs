using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialCostCenter;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialCostCenterService : IMaterialCostCenterService
{
    private readonly ApplicationDbContext _context;

    public MaterialCostCenterService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaterialCostCenterResponse>> GetAllAsync()
    {
        return await _context.MaterialCostCenters
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new MaterialCostCenterResponse
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                CompanyId = c.CompanyId,
                CompanyName = c.Company != null ? c.Company.Name : null,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<MaterialCostCenterResponse?> GetByIdAsync(int id)
    {
        return await _context.MaterialCostCenters
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new MaterialCostCenterResponse
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                CompanyId = c.CompanyId,
                CompanyName = c.Company != null ? c.Company.Name : null,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MaterialCostCenterResponse> CreateAsync(
        CreateMaterialCostCenterRequest request)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();

        await EnsureCompanyExistsAsync(request.CompanyId);

        var duplicateCode = await _context.MaterialCostCenters
            .AnyAsync(c => c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Cost center code already exists.");

        var costCenter = new Models.MaterialCostCenter
        {
            Code = code,
            Name = name,
            CompanyId = request.CompanyId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.MaterialCostCenters.Add(costCenter);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(costCenter.Id)
            ?? throw new Exception(
                "Unable to load created cost center.");
    }

    public async Task<MaterialCostCenterResponse?> UpdateAsync(
        int id,
        UpdateMaterialCostCenterRequest request)
    {
        var costCenter = await _context.MaterialCostCenters
            .FirstOrDefaultAsync(c => c.Id == id);

        if (costCenter == null)
            return null;

        var code = request.Code.Trim();
        var name = request.Name.Trim();

        await EnsureCompanyExistsAsync(request.CompanyId);

        var duplicateCode = await _context.MaterialCostCenters
            .AnyAsync(c =>
                c.Id != id &&
                c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Cost center code already exists.");

        costCenter.Code = code;
        costCenter.Name = name;
        costCenter.CompanyId = request.CompanyId;
        costCenter.IsActive = request.IsActive;
        costCenter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var costCenter = await _context.MaterialCostCenters
            .FirstOrDefaultAsync(c => c.Id == id);

        if (costCenter == null)
            return false;

        costCenter.IsActive = false;
        costCenter.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task EnsureCompanyExistsAsync(int? companyId)
    {
        if (companyId == null)
            return;

        var exists = await _context.Companies
            .AnyAsync(c => c.Id == companyId);

        if (!exists)
            throw new InvalidOperationException(
                "Selected entity does not exist.");
    }
}
