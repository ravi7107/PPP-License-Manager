using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Common;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Inventory;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Generic, multi-department inventory register - see InventoryItem's own
 * doc comment for the model design. This service is wholly additive: it
 * only ever reads from Asset/PurchaseRequisition/PurchaseRequisitionLineItem/
 * LicensePurchase/Company/Department/OfficeLocation/Vendor, never writes
 * to any of them, so nothing in Asset/Material Movement/License/Reports
 * is affected by this module existing.
 */
public class InventoryService : IInventoryService
{
    private readonly ApplicationDbContext _context;

    public InventoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResponse<InventoryItemResponse>> GetPagedAsync(
        int page,
        int pageSize,
        int? categoryId,
        int? companyId,
        int? locationId,
        bool? isActive,
        string? search,
        ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var query = BuildBaseQuery();

        if (isRestricted && restrictedCompanyId.HasValue)
        {
            query = query.Where(i => i.CompanyId == restrictedCompanyId.Value);
        }
        else if (companyId.HasValue)
        {
            query = query.Where(i => i.CompanyId == companyId.Value);
        }

        if (categoryId.HasValue)
        {
            query = query.Where(i => i.CategoryId == categoryId.Value);
        }

        if (locationId.HasValue)
        {
            query = query.Where(i => i.LocationId == locationId.Value);
        }

        // Default to active-only, matching the rest of the app's list
        // screens (Hardware/Licenses/etc.) - pass isActive=false
        // explicitly to see deactivated items.
        query = query.Where(i => i.IsActive == (isActive ?? true));

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(i =>
                i.InventoryTag.ToLower().Contains(term) ||
                i.ItemName.ToLower().Contains(term) ||
                (i.SerialNumber != null && i.SerialNumber.ToLower().Contains(term)));
        }

        var totalRecords = await query.CountAsync();

        var items = await query
            .OrderByDescending(i => i.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return new PagedResponse<InventoryItemResponse>
        {
            Items = items.Select(MapToResponse).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalRecords = totalRecords,
        };
    }

    public async Task<InventoryItemResponse?> GetByIdAsync(int id, ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var item = await BuildBaseQuery().FirstOrDefaultAsync(i => i.Id == id);

        if (item == null)
        {
            return null;
        }

        if (isRestricted && restrictedCompanyId.HasValue && item.CompanyId != restrictedCompanyId.Value)
        {
            return null;
        }

        return MapToResponse(item);
    }

    public async Task<InventoryItemResponse> CreateAsync(
        CreateInventoryItemRequest request, ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var companyId = request.CompanyId;

        if (isRestricted && restrictedCompanyId.HasValue)
        {
            // A restricted (Team Lead/Manager) caller can only ever
            // create items in their own entity, regardless of what the
            // request body says - same guard AssetService applies.
            companyId = restrictedCompanyId.Value;
        }

        var companyExists = await _context.Companies.AnyAsync(c => c.Id == companyId);
        if (!companyExists)
        {
            throw new InvalidOperationException("The selected Entity was not found.");
        }

        var category = await _context.InventoryCategories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.IsActive);
        if (category == null)
        {
            throw new InvalidOperationException("The selected Category was not found or is inactive.");
        }

        if (request.LocationId.HasValue)
        {
            var locationExists = await _context.OfficeLocations
                .AnyAsync(l => l.Id == request.LocationId.Value);
            if (!locationExists)
            {
                throw new InvalidOperationException("The selected Location was not found.");
            }
        }

        if (request.DepartmentId.HasValue)
        {
            var departmentExists = await _context.Departments
                .AnyAsync(d => d.Id == request.DepartmentId.Value);
            if (!departmentExists)
            {
                throw new InvalidOperationException("The selected Department was not found.");
            }
        }

        var assetId = request.AssetId;
        if (assetId.HasValue)
        {
            var assetExists = await _context.Assets
                .AnyAsync(a => a.Id == assetId.Value && a.IsActive);
            if (!assetExists)
            {
                throw new InvalidOperationException("The linked Asset was not found or is inactive.");
            }
        }

        // When this item IS a linked Asset, its own PR link (if any) is
        // what's shown - this item never carries a separate PR line of
        // its own, so any submitted line id is ignored rather than
        // erroring (the client's PR picker is hidden once an Asset is
        // chosen, so this only ever fires if both were somehow sent).
        var purchaseRequisitionLineItemId = assetId.HasValue
            ? null
            : await ValidateAndResolveLineAsync(request.PurchaseRequisitionLineItemId);

        int? purchaseRequisitionId = null;
        if (purchaseRequisitionLineItemId.HasValue)
        {
            purchaseRequisitionId = await _context.PurchaseRequisitionLineItems
                .Where(l => l.Id == purchaseRequisitionLineItemId.Value)
                .Select(l => (int?)l.PurchaseRequisitionId)
                .FirstOrDefaultAsync();
        }

        if (request.VendorId.HasValue)
        {
            var vendorExists = await _context.Vendors.AnyAsync(v => v.Id == request.VendorId.Value);
            if (!vendorExists)
            {
                throw new InvalidOperationException("The selected Vendor was not found.");
            }
        }

        var inventoryTag = string.IsNullOrWhiteSpace(request.InventoryTag)
            ? await GenerateUniqueInventoryTagAsync()
            : request.InventoryTag.Trim();

        if (!string.IsNullOrWhiteSpace(request.InventoryTag))
        {
            var tagInUse = await _context.InventoryItems
                .AnyAsync(i => i.InventoryTag == inventoryTag);
            if (tagInUse)
            {
                throw new InvalidOperationException(
                    $"Inventory Tag \"{inventoryTag}\" is already in use.");
            }
        }

        var entity = new InventoryItem
        {
            InventoryTag = inventoryTag,
            ItemName = request.ItemName.Trim(),
            Description = request.Description,
            SerialNumber = string.IsNullOrWhiteSpace(request.SerialNumber)
                ? null
                : request.SerialNumber.Trim(),
            CategoryId = request.CategoryId,
            CompanyId = companyId,
            LocationId = request.LocationId,
            DepartmentId = request.DepartmentId,
            AssetId = assetId,
            PurchaseRequisitionId = purchaseRequisitionId,
            PurchaseRequisitionLineItemId = purchaseRequisitionLineItemId,
            PurchaseCost = assetId.HasValue ? null : request.PurchaseCost,
            VendorId = assetId.HasValue ? null : request.VendorId,
            Remarks = request.Remarks,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.InventoryItems.Add(entity);
        await _context.SaveChangesAsync();

        var created = await BuildBaseQuery().FirstAsync(i => i.Id == entity.Id);
        return MapToResponse(created);
    }

    public async Task<InventoryItemResponse?> UpdateAsync(
        int id, UpdateInventoryItemRequest request, ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var entity = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id);
        if (entity == null)
        {
            return null;
        }

        if (isRestricted && restrictedCompanyId.HasValue && entity.CompanyId != restrictedCompanyId.Value)
        {
            return null;
        }

        var category = await _context.InventoryCategories
            .FirstOrDefaultAsync(c => c.Id == request.CategoryId && c.IsActive);
        if (category == null)
        {
            throw new InvalidOperationException("The selected Category was not found or is inactive.");
        }

        if (request.LocationId.HasValue)
        {
            var locationExists = await _context.OfficeLocations
                .AnyAsync(l => l.Id == request.LocationId.Value);
            if (!locationExists)
            {
                throw new InvalidOperationException("The selected Location was not found.");
            }
        }

        if (request.DepartmentId.HasValue)
        {
            var departmentExists = await _context.Departments
                .AnyAsync(d => d.Id == request.DepartmentId.Value);
            if (!departmentExists)
            {
                throw new InvalidOperationException("The selected Department was not found.");
            }
        }

        var assetId = request.AssetId;
        if (assetId.HasValue)
        {
            var assetExists = await _context.Assets
                .AnyAsync(a => a.Id == assetId.Value && a.IsActive);
            if (!assetExists)
            {
                throw new InvalidOperationException("The linked Asset was not found or is inactive.");
            }
        }

        // Re-resolving the PR line on every update (rather than leaving
        // it untouched unless changed) mirrors Asset's own edit-mode fix
        // from this engagement's earlier "Link to Purchase Requisition"
        // work: round-trip the EXISTING link unchanged when the caller
        // didn't intend to change it. The client always sends back
        // whatever line id GetByIdAsync/UpdateAsync's own response last
        // returned, so "unchanged" and "resubmit the same value" are the
        // same request here - this only re-validates remaining quantity
        // when the value actually differs from what's already stored.
        int? purchaseRequisitionLineItemId = entity.PurchaseRequisitionLineItemId;
        if (assetId.HasValue)
        {
            purchaseRequisitionLineItemId = null;
        }
        else if (request.PurchaseRequisitionLineItemId != entity.PurchaseRequisitionLineItemId)
        {
            purchaseRequisitionLineItemId = await ValidateAndResolveLineAsync(
                request.PurchaseRequisitionLineItemId,
                excludeInventoryItemId: entity.Id);
        }

        int? purchaseRequisitionId = entity.PurchaseRequisitionId;
        if (purchaseRequisitionLineItemId != entity.PurchaseRequisitionLineItemId)
        {
            purchaseRequisitionId = purchaseRequisitionLineItemId.HasValue
                ? await _context.PurchaseRequisitionLineItems
                    .Where(l => l.Id == purchaseRequisitionLineItemId.Value)
                    .Select(l => (int?)l.PurchaseRequisitionId)
                    .FirstOrDefaultAsync()
                : null;
        }

        if (request.VendorId.HasValue)
        {
            var vendorExists = await _context.Vendors.AnyAsync(v => v.Id == request.VendorId.Value);
            if (!vendorExists)
            {
                throw new InvalidOperationException("The selected Vendor was not found.");
            }
        }

        entity.ItemName = request.ItemName.Trim();
        entity.Description = request.Description;
        entity.SerialNumber = string.IsNullOrWhiteSpace(request.SerialNumber)
            ? null
            : request.SerialNumber.Trim();
        entity.CategoryId = request.CategoryId;
        entity.LocationId = request.LocationId;
        entity.DepartmentId = request.DepartmentId;
        entity.AssetId = assetId;
        entity.PurchaseRequisitionId = purchaseRequisitionId;
        entity.PurchaseRequisitionLineItemId = purchaseRequisitionLineItemId;
        entity.PurchaseCost = assetId.HasValue ? null : request.PurchaseCost;
        entity.VendorId = assetId.HasValue ? null : request.VendorId;
        entity.Remarks = request.Remarks;
        entity.IsActive = request.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        var updated = await BuildBaseQuery().FirstAsync(i => i.Id == entity.Id);
        return MapToResponse(updated);
    }

    public async Task<bool> DeactivateAsync(int id, ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var entity = await _context.InventoryItems.FirstOrDefaultAsync(i => i.Id == id);
        if (entity == null)
        {
            return false;
        }

        if (isRestricted && restrictedCompanyId.HasValue && entity.CompanyId != restrictedCompanyId.Value)
        {
            return false;
        }

        entity.IsActive = false;
        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<List<InventoryCategoryResponse>> GetCategoriesAsync()
    {
        return await _context.InventoryCategories
            .Where(c => c.IsActive)
            .OrderBy(c => c.Name)
            .Select(c => new InventoryCategoryResponse
            {
                Id = c.Id,
                Code = c.Code,
                Name = c.Name,
                Description = c.Description,
                IsActive = c.IsActive,
            })
            .ToListAsync();
    }

    public async Task<InventoryCategoryResponse> CreateCategoryAsync(
        CreateInventoryCategoryRequest request)
    {
        var codeInUse = await _context.InventoryCategories
            .AnyAsync(c => c.Code == request.Code);
        if (codeInUse)
        {
            throw new InvalidOperationException(
                $"Category code \"{request.Code}\" is already in use.");
        }

        var entity = new InventoryCategory
        {
            Code = request.Code.Trim(),
            Name = request.Name.Trim(),
            Description = request.Description,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
        };

        _context.InventoryCategories.Add(entity);
        await _context.SaveChangesAsync();

        return new InventoryCategoryResponse
        {
            Id = entity.Id,
            Code = entity.Code,
            Name = entity.Name,
            Description = entity.Description,
            IsActive = entity.IsActive,
        };
    }

    public async Task<string?> GenerateQrSvgAsync(int id, ClaimsPrincipal user)
    {
        var (isRestricted, restrictedCompanyId) = EntityScopeHelper.Resolve(user);

        var item = await _context.InventoryItems
            .Include(i => i.Asset)
            .FirstOrDefaultAsync(i => i.Id == id);
        if (item == null)
        {
            return null;
        }

        if (isRestricted && restrictedCompanyId.HasValue && item.CompanyId != restrictedCompanyId.Value)
        {
            return null;
        }

        // Asset-linked items encode the Asset's own AssetTag here too -
        // see InventoryItemResponse.DisplayTag's own comment for why.
        return AssetQrCodeGenerator.GenerateSvg(item.Asset?.AssetTag ?? item.InventoryTag);
    }

    // --- Private helpers -----------------------------------------------

    private IQueryable<InventoryItem> BuildBaseQuery()
    {
        return _context.InventoryItems
            .Include(i => i.Category)
            .Include(i => i.Company)
            .Include(i => i.Location)
            .Include(i => i.Department)
            .Include(i => i.Vendor)
            .Include(i => i.PurchaseRequisition)
            .Include(i => i.Asset).ThenInclude(a => a!.PurchaseRequisition)
            .Include(i => i.Asset).ThenInclude(a => a!.Vendor)
            .AsQueryable();
    }

    // Validates an optional PR line link exactly the way Asset's own
    // create/update path does: the PR must be Approved, and the line
    // must still have unfulfilled quantity once every Asset,
    // LicensePurchase, and InventoryItem already linked to it is
    // counted (excluding this same InventoryItem's own prior link, on
    // an update, so re-saving an already-linked item doesn't count
    // itself as consuming its own quantity twice).
    private async Task<int?> ValidateAndResolveLineAsync(
        int? lineItemId, int? excludeInventoryItemId = null)
    {
        if (!lineItemId.HasValue)
        {
            return null;
        }

        var line = await _context.PurchaseRequisitionLineItems
            .Include(l => l.PurchaseRequisition)
            .FirstOrDefaultAsync(l => l.Id == lineItemId.Value);

        if (line == null || line.PurchaseRequisition == null ||
            line.PurchaseRequisition.Status != "Approved")
        {
            throw new InvalidOperationException(
                "The selected Purchase Requisition line is not available for linking.");
        }

        var assetCount = await _context.Assets
            .CountAsync(a => a.PurchaseRequisitionLineItemId == lineItemId.Value);

        var licenseCount = await _context.LicensePurchases
            .CountAsync(lp => lp.PurchaseRequisitionLineItemId == lineItemId.Value);

        var inventoryCount = await _context.InventoryItems
            .Where(i => i.PurchaseRequisitionLineItemId == lineItemId.Value)
            .Where(i => excludeInventoryItemId == null || i.Id != excludeInventoryItemId.Value)
            .CountAsync();

        var alreadyFulfilled = assetCount + licenseCount + inventoryCount;

        if (alreadyFulfilled >= line.Quantity)
        {
            throw new InvalidOperationException(
                "This Purchase Requisition line has no remaining unfulfilled quantity.");
        }

        return lineItemId;
    }

    // Format: INV-{year}-{6-digit sequence}, mirroring the existing
    // Gate Pass numbering convention (GP-{year}-{6-digit seq}) already
    // used elsewhere in this app. Retries on the rare race where two
    // requests generate the same candidate concurrently.
    private async Task<string> GenerateUniqueInventoryTagAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"INV-{year}-";

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var countThisYear = await _context.InventoryItems
                .CountAsync(i => i.InventoryTag.StartsWith(prefix));

            var candidate = $"{prefix}{(countThisYear + 1 + attempt):D6}";

            var exists = await _context.InventoryItems
                .AnyAsync(i => i.InventoryTag == candidate);

            if (!exists)
            {
                return candidate;
            }
        }

        // Extremely unlikely fallback - a GUID fragment guarantees
        // uniqueness even under sustained concurrent collisions.
        return $"{prefix}{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }

    private static InventoryItemResponse MapToResponse(InventoryItem i)
    {
        // When linked to an Asset, PR/PO/cost/vendor are read through
        // THAT Asset's own linked PurchaseRequisition (which the Asset
        // itself already reads through, per this engagement's earlier
        // "Sourced from PR" work) - never through this item's own
        // (always-null in that case) fields. Otherwise, read through
        // this item's own direct PurchaseRequisition/PurchaseCost/
        // Vendor.
        var sourcePr = i.Asset?.PurchaseRequisition ?? i.PurchaseRequisition;
        var sourceCost = i.Asset != null ? i.Asset.PurchaseCost : i.PurchaseCost;
        var sourceVendorId = i.Asset != null ? i.Asset.VendorId : i.VendorId;
        var sourceVendorName = i.Asset != null ? i.Asset.Vendor?.VendorName : i.Vendor?.VendorName;

        return new InventoryItemResponse
        {
            Id = i.Id,
            InventoryTag = i.InventoryTag,
            DisplayTag = i.Asset?.AssetTag ?? i.InventoryTag,
            ItemName = i.ItemName,
            Description = i.Description,
            SerialNumber = i.SerialNumber,
            CategoryId = i.CategoryId,
            CategoryName = i.Category?.Name ?? string.Empty,
            CompanyId = i.CompanyId,
            CompanyName = i.Company?.Name ?? string.Empty,
            LocationId = i.LocationId,
            LocationName = i.Location?.LocationName,
            DepartmentId = i.DepartmentId,
            DepartmentName = i.Department?.DepartmentName,
            AssetId = i.AssetId,
            AssetTag = i.Asset?.AssetTag,
            PurchaseRequisitionId = i.PurchaseRequisitionId,
            PurchaseRequisitionLineItemId = i.PurchaseRequisitionLineItemId,
            PrNumber = sourcePr?.PrNumber,
            PoNumber = sourcePr?.PoNumber,
            PoDate = sourcePr?.PoDate,
            PoAmount = sourcePr?.PoAmount,
            PurchaseCost = sourceCost,
            VendorId = sourceVendorId,
            VendorName = sourceVendorName,
            Remarks = i.Remarks,
            IsActive = i.IsActive,
            CreatedAt = i.CreatedAt,
            UpdatedAt = i.UpdatedAt,
        };
    }
}
