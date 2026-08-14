using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialItem;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialItemService : IMaterialItemService
{
    // Stock, Consumable, IT Asset, Equipment, Tool, Spare Part, Other - per
    // the Phase 2 design doc's material type list. No C# enum is used here,
    // matching this codebase's existing convention of plain validated
    // strings for status/type fields (Asset.Status, PurchaseRequisition.
    // Status, etc.).
    public static readonly string[] AllowedMaterialTypes =
    {
        "Stock",
        "Consumable",
        "ITAsset",
        "Equipment",
        "Tool",
        "SparePart",
        "Other"
    };

    private readonly ApplicationDbContext _context;

    public MaterialItemService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaterialItemResponse>> GetAllAsync()
    {
        return await _context.MaterialItems
            .AsNoTracking()
            .OrderBy(i => i.ItemName)
            .Select(i => new MaterialItemResponse
            {
                Id = i.Id,
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                CategoryId = i.CategoryId,
                CategoryName = i.Category.Name,
                MaterialType = i.MaterialType,
                UnitOfMeasure = i.UnitOfMeasure,
                IsSerialized = i.IsSerialized,
                Description = i.Description,
                IsActive = i.IsActive,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt
            })
            .ToListAsync();
    }

    public async Task<MaterialItemResponse?> GetByIdAsync(int id)
    {
        return await _context.MaterialItems
            .AsNoTracking()
            .Where(i => i.Id == id)
            .Select(i => new MaterialItemResponse
            {
                Id = i.Id,
                ItemCode = i.ItemCode,
                ItemName = i.ItemName,
                CategoryId = i.CategoryId,
                CategoryName = i.Category.Name,
                MaterialType = i.MaterialType,
                UnitOfMeasure = i.UnitOfMeasure,
                IsSerialized = i.IsSerialized,
                Description = i.Description,
                IsActive = i.IsActive,
                CreatedAt = i.CreatedAt,
                UpdatedAt = i.UpdatedAt
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MaterialItemResponse> CreateAsync(
        CreateMaterialItemRequest request)
    {
        var itemCode = request.ItemCode.Trim();
        var itemName = request.ItemName.Trim();
        var materialType = ValidateMaterialType(request.MaterialType);

        await EnsureCategoryExistsAsync(request.CategoryId);

        var duplicateCode = await _context.MaterialItems
            .AnyAsync(i => i.ItemCode.ToLower() == itemCode.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Item code already exists.");

        var item = new Models.MaterialItem
        {
            ItemCode = itemCode,
            ItemName = itemName,
            CategoryId = request.CategoryId,
            MaterialType = materialType,
            UnitOfMeasure = NullIfBlank(request.UnitOfMeasure),
            IsSerialized = request.IsSerialized,
            Description = NullIfBlank(request.Description),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.MaterialItems.Add(item);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(item.Id)
            ?? throw new Exception(
                "Unable to load created item.");
    }

    public async Task<MaterialItemResponse?> UpdateAsync(
        int id,
        UpdateMaterialItemRequest request)
    {
        var item = await _context.MaterialItems
            .FirstOrDefaultAsync(i => i.Id == id);

        if (item == null)
            return null;

        var itemCode = request.ItemCode.Trim();
        var itemName = request.ItemName.Trim();
        var materialType = ValidateMaterialType(request.MaterialType);

        await EnsureCategoryExistsAsync(request.CategoryId);

        var duplicateCode = await _context.MaterialItems
            .AnyAsync(i =>
                i.Id != id &&
                i.ItemCode.ToLower() == itemCode.ToLower());

        if (duplicateCode)
            throw new InvalidOperationException(
                "Item code already exists.");

        item.ItemCode = itemCode;
        item.ItemName = itemName;
        item.CategoryId = request.CategoryId;
        item.MaterialType = materialType;
        item.UnitOfMeasure = NullIfBlank(request.UnitOfMeasure);
        item.IsSerialized = request.IsSerialized;
        item.Description = NullIfBlank(request.Description);
        item.IsActive = request.IsActive;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var item = await _context.MaterialItems
            .FirstOrDefaultAsync(i => i.Id == id);

        if (item == null)
            return false;

        // Soft delete, same convention as Client/Vendor/MaterialItemCategory
        // - preserves historical references from any movement line that
        // already used it.
        item.IsActive = false;
        item.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task EnsureCategoryExistsAsync(int categoryId)
    {
        var exists = await _context.MaterialItemCategories
            .AnyAsync(c => c.Id == categoryId);

        if (!exists)
            throw new InvalidOperationException(
                "Selected category does not exist.");
    }

    private static string ValidateMaterialType(string materialType)
    {
        var trimmed = materialType.Trim();

        if (!AllowedMaterialTypes.Contains(trimmed))
            throw new InvalidOperationException(
                $"Invalid material type. Allowed values: {string.Join(", ", AllowedMaterialTypes)}.");

        return trimmed;
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
