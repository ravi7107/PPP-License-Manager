using System.Security.Claims;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.DTOs.Inventory;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface IInventoryService
{
    Task<PagedResponse<InventoryItemResponse>> GetPagedAsync(
        int page,
        int pageSize,
        int? categoryId,
        int? companyId,
        int? locationId,
        bool? isActive,
        string? search,
        ClaimsPrincipal user);

    Task<InventoryItemResponse?> GetByIdAsync(int id, ClaimsPrincipal user);

    Task<InventoryItemResponse> CreateAsync(
        CreateInventoryItemRequest request, ClaimsPrincipal user);

    Task<InventoryItemResponse?> UpdateAsync(
        int id, UpdateInventoryItemRequest request, ClaimsPrincipal user);

    Task<bool> DeactivateAsync(int id, ClaimsPrincipal user);

    Task<List<InventoryCategoryResponse>> GetCategoriesAsync();

    Task<InventoryCategoryResponse> CreateCategoryAsync(
        CreateInventoryCategoryRequest request);

    // Returns the QR SVG markup for the item's InventoryTag, or null if
    // the item doesn't exist / isn't visible to this user (same access
    // rule as GetByIdAsync).
    Task<string?> GenerateQrSvgAsync(int id, ClaimsPrincipal user);
}
