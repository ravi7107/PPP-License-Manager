using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialItemCategory;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialItemCategoryService : IMaterialItemCategoryService
{
    private readonly ApplicationDbContext _context;

    public MaterialItemCategoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaterialItemCategoryResponse>> GetAllAsync()
    {
        return await _context.MaterialItemCategories
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .Select(c => new MaterialItemCategoryResponse
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                ItemCount = _context.MaterialItems.Count(i => i.CategoryId == c.Id)
            })
            .ToListAsync();
    }

    public async Task<MaterialItemCategoryResponse?> GetByIdAsync(int id)
    {
        return await _context.MaterialItemCategories
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new MaterialItemCategoryResponse
            {
                Id = c.Id,
                Name = c.Name,
                Code = c.Code,
                IsActive = c.IsActive,
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt,
                ItemCount = _context.MaterialItems.Count(i => i.CategoryId == c.Id)
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MaterialItemCategoryResponse> CreateAsync(
        CreateMaterialItemCategoryRequest request)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var duplicateCode = await _context.MaterialItemCategories
            .AnyAsync(c => c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Category code already exists.");

        var category = new Models.MaterialItemCategory
        {
            Name = name,
            Code = code,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.MaterialItemCategories.Add(category);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(category.Id)
            ?? throw new Exception(
                "Unable to load created category.");
    }

    public async Task<MaterialItemCategoryResponse?> UpdateAsync(
        int id,
        UpdateMaterialItemCategoryRequest request)
    {
        var category = await _context.MaterialItemCategories
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
            return null;

        var code = request.Code.Trim();
        var name = request.Name.Trim();

        var duplicateCode = await _context.MaterialItemCategories
            .AnyAsync(c =>
                c.Id != id &&
                c.Code.ToLower() == code.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Category code already exists.");

        category.Name = name;
        category.Code = code;
        category.IsActive = request.IsActive;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var category = await _context.MaterialItemCategories
            .FirstOrDefaultAsync(c => c.Id == id);

        if (category == null)
            return false;

        // Soft delete, same convention as Client/Vendor - preserves
        // historical references from any item that already used it
        // (items keep referencing the category by Id regardless of
        // IsActive, same as LicensePurchases -> Client).
        category.IsActive = false;
        category.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }
}
