using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialMovement;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialMovementService : IMaterialMovementService
{
    private readonly ApplicationDbContext _context;

    public MaterialMovementService(ApplicationDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // LIST / GET
    // =========================================================

    public async Task<IEnumerable<MaterialMovementListItemResponse>> GetMineAsync(
        int requestedByUserId)
    {
        return await _context.MaterialMovements
            .AsNoTracking()
            .Where(m => m.RequestedByUserId == requestedByUserId)
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MaterialMovementListItemResponse
            {
                Id = m.Id,
                MovementNumber = m.MovementNumber,
                MovementType = m.MovementType,
                Status = m.Status,
                FromSummary = m.FromLocation != null
                    ? m.FromLocation.LocationName
                    : (m.FromCompany != null ? m.FromCompany.Name : null),
                ToSummary = m.ToLocation != null
                    ? m.ToLocation.LocationName
                    : (m.ToCompany != null ? m.ToCompany.Name : null),
                RequestedByUserName = m.RequestedByUser.FullName,
                ItemCount = m.Items.Count,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<MaterialMovementListItemResponse>> GetAllAsync()
    {
        return await _context.MaterialMovements
            .AsNoTracking()
            .OrderByDescending(m => m.CreatedAt)
            .Select(m => new MaterialMovementListItemResponse
            {
                Id = m.Id,
                MovementNumber = m.MovementNumber,
                MovementType = m.MovementType,
                Status = m.Status,
                FromSummary = m.FromLocation != null
                    ? m.FromLocation.LocationName
                    : (m.FromCompany != null ? m.FromCompany.Name : null),
                ToSummary = m.ToLocation != null
                    ? m.ToLocation.LocationName
                    : (m.ToCompany != null ? m.ToCompany.Name : null),
                RequestedByUserName = m.RequestedByUser.FullName,
                ItemCount = m.Items.Count,
                CreatedAt = m.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<MaterialMovementResponse?> GetByIdAsync(
        int id,
        int requestingUserId,
        bool isPrivileged)
    {
        var response = await _context.MaterialMovements
            .AsNoTracking()
            .Where(m => m.Id == id)
            .Select(m => new MaterialMovementResponse
            {
                Id = m.Id,
                MovementNumber = m.MovementNumber,
                MovementType = m.MovementType,
                Status = m.Status,

                FromCompanyId = m.FromCompanyId,
                FromCompanyName = m.FromCompany != null ? m.FromCompany.Name : null,
                FromLocationId = m.FromLocationId,
                FromLocationName = m.FromLocation != null ? m.FromLocation.LocationName : null,
                FromDepartmentId = m.FromDepartmentId,
                FromDepartmentName = m.FromDepartment != null ? m.FromDepartment.DepartmentName : null,
                FromCostCenterId = m.FromCostCenterId,
                FromCostCenterName = m.FromCostCenter != null ? m.FromCostCenter.Name : null,

                ToCompanyId = m.ToCompanyId,
                ToCompanyName = m.ToCompany != null ? m.ToCompany.Name : null,
                ToLocationId = m.ToLocationId,
                ToLocationName = m.ToLocation != null ? m.ToLocation.LocationName : null,
                ToDepartmentId = m.ToDepartmentId,
                ToDepartmentName = m.ToDepartment != null ? m.ToDepartment.DepartmentName : null,
                ToCostCenterId = m.ToCostCenterId,
                ToCostCenterName = m.ToCostCenter != null ? m.ToCostCenter.Name : null,

                VendorId = m.VendorId,
                VendorName = m.Vendor != null ? m.Vendor.VendorName : null,

                RequestedByUserId = m.RequestedByUserId,
                RequestedByUserName = m.RequestedByUser.FullName,
                RequestedAt = m.RequestedAt,

                ExpectedReturnDate = m.ExpectedReturnDate,
                Purpose = m.Purpose,

                CreatedAt = m.CreatedAt,
                UpdatedAt = m.UpdatedAt,

                Items = m.Items.Select(i => new MaterialMovementItemResponse
                {
                    Id = i.Id,
                    ItemId = i.ItemId,
                    ItemCode = i.Item.ItemCode,
                    ItemName = i.Item.ItemName,
                    MaterialType = i.Item.MaterialType,
                    AssetId = i.AssetId,
                    AssetTag = i.Asset != null ? i.Asset.AssetTag : null,
                    AssetName = i.Asset != null ? i.Asset.AssetName : null,
                    Quantity = i.Quantity,
                    UnitOfMeasure = i.UnitOfMeasure,
                    SerialNumbers = i.SerialNumbers,
                    Condition = i.Condition,
                    Remarks = i.Remarks
                }).ToList()
            })
            .FirstOrDefaultAsync();

        if (response == null)
            return null;

        var isOwner = response.RequestedByUserId == requestingUserId;

        if (!isOwner && !isPrivileged)
            throw new UnauthorizedAccessException(
                "You don't have access to this movement.");

        return response;
    }

    // =========================================================
    // CREATE / UPDATE DRAFT
    // =========================================================

    public async Task<MaterialMovementResponse> CreateDraftAsync(
        SaveMaterialMovementRequest request,
        int requestedByUserId,
        string? ipAddress)
    {
        var requester = await _context.Users
            .FirstOrDefaultAsync(u => u.Id == requestedByUserId);

        if (requester == null || !requester.IsActive)
            throw new InvalidOperationException(
                "Requesting user not found or inactive.");

        var normalized = await ValidateAndNormalizeAsync(request);
        var items = await BuildItemsAsync(request.Items);

        var movement = new Models.MaterialMovement
        {
            MovementType = normalized.MovementType,
            Status = "Draft",

            FromCompanyId = normalized.FromCompanyId,
            FromLocationId = normalized.FromLocationId,
            FromDepartmentId = normalized.FromDepartmentId,
            FromCostCenterId = normalized.FromCostCenterId,

            ToCompanyId = normalized.ToCompanyId,
            ToLocationId = normalized.ToLocationId,
            ToDepartmentId = normalized.ToDepartmentId,
            ToCostCenterId = normalized.ToCostCenterId,

            VendorId = normalized.VendorId,

            RequestedByUserId = requestedByUserId,
            RequestedAt = DateTime.UtcNow,

            ExpectedReturnDate = normalized.ExpectedReturnDate,
            Purpose = string.IsNullOrWhiteSpace(request.Purpose)
                ? null
                : request.Purpose.Trim(),

            CreatedAt = DateTime.UtcNow,
            Items = items
        };

        _context.MaterialMovements.Add(movement);

        await _context.SaveChangesAsync();

        AddAuditLog(movement.Id, "Created", requestedByUserId, ipAddress: ipAddress);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(movement.Id, requestedByUserId, isPrivileged: false)
            ?? throw new InvalidOperationException(
                "Unable to load created movement.");
    }

    public async Task<MaterialMovementResponse?> UpdateDraftAsync(
        int id,
        SaveMaterialMovementRequest request,
        int requestedByUserId,
        string? ipAddress)
    {
        var movement = await _context.MaterialMovements
            .Include(m => m.Items)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (movement == null)
            return null;

        if (movement.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only edit your own movements.");

        if (movement.Status != "Draft")
            throw new InvalidOperationException(
                "Only Draft movements can be edited.");

        var normalized = await ValidateAndNormalizeAsync(request);
        var items = await BuildItemsAsync(request.Items);

        // Replace the whole item set - same "save the whole document"
        // convention as Purchase Requisition line items and the approval
        // workflow's step list.
        _context.MaterialMovementItems.RemoveRange(movement.Items);

        movement.MovementType = normalized.MovementType;

        movement.FromCompanyId = normalized.FromCompanyId;
        movement.FromLocationId = normalized.FromLocationId;
        movement.FromDepartmentId = normalized.FromDepartmentId;
        movement.FromCostCenterId = normalized.FromCostCenterId;

        movement.ToCompanyId = normalized.ToCompanyId;
        movement.ToLocationId = normalized.ToLocationId;
        movement.ToDepartmentId = normalized.ToDepartmentId;
        movement.ToCostCenterId = normalized.ToCostCenterId;

        movement.VendorId = normalized.VendorId;

        movement.ExpectedReturnDate = normalized.ExpectedReturnDate;
        movement.Purpose = string.IsNullOrWhiteSpace(request.Purpose)
            ? null
            : request.Purpose.Trim();

        movement.UpdatedAt = DateTime.UtcNow;
        movement.Items = items;

        await _context.SaveChangesAsync();

        AddAuditLog(movement.Id, "Updated", requestedByUserId, ipAddress: ipAddress);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, requestedByUserId, isPrivileged: false);
    }

    public async Task<bool> DeleteDraftAsync(
        int id,
        int requestedByUserId,
        string? ipAddress)
    {
        var movement = await _context.MaterialMovements
            .FirstOrDefaultAsync(m => m.Id == id);

        if (movement == null)
            return false;

        if (movement.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only delete your own movements.");

        if (movement.Status != "Draft")
            throw new InvalidOperationException(
                "Only Draft movements can be deleted.");

        // A still-Draft movement always has only its own items/audit log
        // rows attached (no approvals/dispatch/receipt exist until
        // submission, a later phase) - a hard delete here is safe and has
        // no orphaned-history risk, same reasoning as PR's DeleteDraftAsync.
        _context.MaterialMovements.Remove(movement);

        await _context.SaveChangesAsync();

        return true;
    }

    // =========================================================
    // VALIDATION / NORMALIZATION
    // =========================================================

    /*
     * Which From/To/VendorId/ExpectedReturnDate fields apply depends on
     * MovementType (see MaterialMovement.cs's class comment):
     *
     *   InternalTransfer      - From+To required, same entity (FromCompanyId
     *                            == ToCompanyId when both given)
     *   InterEntityTransfer   - From+To required, different entities
     *   OutwardToVendor       - From required, VendorId required, no To side
     *   InwardFromVendor      - To required, VendorId required, no From side
     *   TemporaryMovement     - From+To required (any entity pairing) plus a
     *                            future ExpectedReturnDate
     *   DirectInward          - To required, no From side, no vendor
     *   DirectOutward         - From required, no To side, no vendor
     *
     * Fields that don't apply to the resolved type are silently cleared
     * (normalized to null) rather than rejected, so the frontend doesn't
     * have to scrub inapplicable fields itself before saving.
     */
    private async Task<(
        string MovementType,
        int? FromCompanyId,
        int? FromLocationId,
        int? FromDepartmentId,
        int? FromCostCenterId,
        int? ToCompanyId,
        int? ToLocationId,
        int? ToDepartmentId,
        int? ToCostCenterId,
        int? VendorId,
        DateTime? ExpectedReturnDate)>
        ValidateAndNormalizeAsync(SaveMaterialMovementRequest request)
    {
        var movementType = (request.MovementType ?? string.Empty).Trim();

        if (!MaterialApprovalWorkflowService.AllowedMovementTypes.Contains(movementType))
            throw new InvalidOperationException(
                $"Invalid movement type. Allowed values: {string.Join(", ", MaterialApprovalWorkflowService.AllowedMovementTypes)}.");

        bool requireFrom;
        bool requireTo;
        bool requireVendor;
        bool requireReturnDate;
        bool sameEntityOnly = false;

        switch (movementType)
        {
            case "InternalTransfer":
                requireFrom = true;
                requireTo = true;
                requireVendor = false;
                requireReturnDate = false;
                sameEntityOnly = true;
                break;

            case "InterEntityTransfer":
                requireFrom = true;
                requireTo = true;
                requireVendor = false;
                requireReturnDate = false;
                break;

            case "OutwardToVendor":
                requireFrom = true;
                requireTo = false;
                requireVendor = true;
                requireReturnDate = false;
                break;

            case "InwardFromVendor":
                requireFrom = false;
                requireTo = true;
                requireVendor = true;
                requireReturnDate = false;
                break;

            case "TemporaryMovement":
                requireFrom = true;
                requireTo = true;
                requireVendor = false;
                requireReturnDate = true;
                break;

            case "DirectInward":
                requireFrom = false;
                requireTo = true;
                requireVendor = false;
                requireReturnDate = false;
                break;

            case "DirectOutward":
                requireFrom = true;
                requireTo = false;
                requireVendor = false;
                requireReturnDate = false;
                break;

            default:
                // Unreachable - already validated above.
                throw new InvalidOperationException("Invalid movement type.");
        }

        int? fromCompanyId = null;
        int? fromLocationId = null;
        int? fromDepartmentId = null;
        int? fromCostCenterId = null;

        if (requireFrom)
        {
            if (!request.FromCompanyId.HasValue || !request.FromLocationId.HasValue)
                throw new InvalidOperationException(
                    $"{movementType} requires both a from entity and a from location.");

            await EnsureCompanyExistsAsync(request.FromCompanyId);
            await EnsureLocationExistsAsync(request.FromLocationId);
            await EnsureDepartmentExistsAsync(request.FromDepartmentId);
            await EnsureCostCenterExistsAsync(request.FromCostCenterId);

            fromCompanyId = request.FromCompanyId;
            fromLocationId = request.FromLocationId;
            fromDepartmentId = request.FromDepartmentId;
            fromCostCenterId = request.FromCostCenterId;
        }

        int? toCompanyId = null;
        int? toLocationId = null;
        int? toDepartmentId = null;
        int? toCostCenterId = null;

        if (requireTo)
        {
            if (!request.ToCompanyId.HasValue || !request.ToLocationId.HasValue)
                throw new InvalidOperationException(
                    $"{movementType} requires both a to entity and a to location.");

            await EnsureCompanyExistsAsync(request.ToCompanyId);
            await EnsureLocationExistsAsync(request.ToLocationId);
            await EnsureDepartmentExistsAsync(request.ToDepartmentId);
            await EnsureCostCenterExistsAsync(request.ToCostCenterId);

            toCompanyId = request.ToCompanyId;
            toLocationId = request.ToLocationId;
            toDepartmentId = request.ToDepartmentId;
            toCostCenterId = request.ToCostCenterId;
        }

        if (sameEntityOnly &&
            fromCompanyId.HasValue &&
            toCompanyId.HasValue &&
            fromCompanyId.Value != toCompanyId.Value)
            throw new InvalidOperationException(
                "Internal transfers must stay within the same entity - use Inter-Entity Transfer to move between entities.");

        if (movementType == "InterEntityTransfer" &&
            fromCompanyId.HasValue &&
            toCompanyId.HasValue &&
            fromCompanyId.Value == toCompanyId.Value)
            throw new InvalidOperationException(
                "Inter-entity transfers must move between two different entities - use Internal Transfer within the same entity.");

        int? vendorId = null;

        if (requireVendor)
        {
            if (!request.VendorId.HasValue)
                throw new InvalidOperationException(
                    $"{movementType} requires a vendor.");

            var vendor = await _context.Vendors
                .FirstOrDefaultAsync(v => v.Id == request.VendorId.Value);

            if (vendor == null || !vendor.IsActive)
                throw new InvalidOperationException(
                    "Selected vendor does not exist or is inactive.");

            vendorId = request.VendorId;
        }

        DateTime? expectedReturnDate = null;

        if (requireReturnDate)
        {
            if (!request.ExpectedReturnDate.HasValue)
                throw new InvalidOperationException(
                    "Temporary movements require an expected return date.");

            if (request.ExpectedReturnDate.Value.Date < DateTime.UtcNow.Date)
                throw new InvalidOperationException(
                    "Expected return date cannot be in the past.");

            expectedReturnDate = request.ExpectedReturnDate;
        }

        return (
            movementType,
            fromCompanyId,
            fromLocationId,
            fromDepartmentId,
            fromCostCenterId,
            toCompanyId,
            toLocationId,
            toDepartmentId,
            toCostCenterId,
            vendorId,
            expectedReturnDate);
    }

    private async Task<List<Models.MaterialMovementItem>> BuildItemsAsync(
        List<MaterialMovementItemRequest> itemRequests)
    {
        var items = new List<Models.MaterialMovementItem>();
        var lineNumber = 1;

        foreach (var itemRequest in itemRequests)
        {
            var item = await _context.MaterialItems
                .FirstOrDefaultAsync(i => i.Id == itemRequest.ItemId);

            if (item == null || !item.IsActive)
                throw new InvalidOperationException(
                    $"Line {lineNumber}'s selected item does not exist or is inactive.");

            Models.Asset? asset = null;

            if (itemRequest.AssetId.HasValue)
            {
                if (item.MaterialType != "ITAsset" || !item.IsSerialized)
                    throw new InvalidOperationException(
                        $"Line {lineNumber}: an asset can only be linked to a serialized IT Asset item.");

                asset = await _context.Assets
                    .FirstOrDefaultAsync(a => a.Id == itemRequest.AssetId.Value);

                if (asset == null || !asset.IsActive)
                    throw new InvalidOperationException(
                        $"Line {lineNumber}'s selected asset does not exist or is inactive.");
            }

            items.Add(new Models.MaterialMovementItem
            {
                ItemId = item.Id,
                AssetId = asset?.Id,
                Quantity = itemRequest.Quantity,
                UnitOfMeasure = NullIfBlank(itemRequest.UnitOfMeasure),
                SerialNumbers = NullIfBlank(itemRequest.SerialNumbers),
                Condition = NullIfBlank(itemRequest.Condition),
                Remarks = NullIfBlank(itemRequest.Remarks),
                CreatedAt = DateTime.UtcNow
            });

            lineNumber++;
        }

        return items;
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

    private async Task EnsureLocationExistsAsync(int? locationId)
    {
        if (locationId == null)
            return;

        var exists = await _context.OfficeLocations
            .AnyAsync(l => l.Id == locationId);

        if (!exists)
            throw new InvalidOperationException(
                "Selected location does not exist.");
    }

    private async Task EnsureDepartmentExistsAsync(int? departmentId)
    {
        if (departmentId == null)
            return;

        var exists = await _context.Departments
            .AnyAsync(d => d.Id == departmentId);

        if (!exists)
            throw new InvalidOperationException(
                "Selected department does not exist.");
    }

    private async Task EnsureCostCenterExistsAsync(int? costCenterId)
    {
        if (costCenterId == null)
            return;

        var exists = await _context.MaterialCostCenters
            .AnyAsync(c => c.Id == costCenterId);

        if (!exists)
            throw new InvalidOperationException(
                "Selected cost center does not exist.");
    }

    private static string? NullIfBlank(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private void AddAuditLog(
        int movementId,
        string action,
        int? actorUserId,
        string? details = null,
        string? ipAddress = null)
    {
        _context.MaterialMovementAuditLogs.Add(new Models.MaterialMovementAuditLog
        {
            MovementId = movementId,
            Action = action,
            ActorUserId = actorUserId,
            ActionAt = DateTime.UtcNow,
            Details = details,
            IpAddress = ipAddress
        });
    }
}
