using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialMovement;
using PPS.LicenseManager.API.Services.Interfaces;
using QuestPDF.Fluent;

namespace PPS.LicenseManager.API.Services;

public class MaterialMovementService : IMaterialMovementService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<MaterialMovementService> _logger;

    public MaterialMovementService(
        ApplicationDbContext context,
        ILogger<MaterialMovementService> logger)
    {
        _context = context;
        _logger = logger;
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
                CurrentApprovalStepOrder = m.CurrentApprovalStepOrder,

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
                }).ToList(),

                Approvals = m.Approvals
                    .OrderBy(a => a.StepOrder)
                    .Select(a => new MaterialMovementApprovalResponse
                    {
                        Id = a.Id,
                        StepOrder = a.StepOrder,
                        ApproverUserId = a.ApproverUserId,
                        ApproverUserName = a.ApproverUser != null ? a.ApproverUser.FullName : null,
                        Status = a.Status,
                        ActionedAt = a.ActionedAt,
                        Comments = a.Comments
                    }).ToList()
            })
            .FirstOrDefaultAsync();

        if (response == null)
            return null;

        // A movement's currently-assigned approver needs to be able to
        // open it (to see the full item list/approval trail before
        // deciding) even though they're neither the owner nor a
        // privileged role - same "assigned approver can view" carve-out
        // as PurchaseRequisitionService.GetPdfFileAsync's isAssignedApprover
        // check.
        var isOwner = response.RequestedByUserId == requestingUserId;
        var isAssignedApprover = response.Approvals.Any(a =>
            a.StepOrder == response.CurrentApprovalStepOrder &&
            a.ApproverUserId == requestingUserId &&
            a.Status == "Pending");

        if (!isOwner && !isPrivileged && !isAssignedApprover)
            throw new UnauthorizedAccessException(
                "You don't have access to this movement.");

        response.Dispatch = await _context.MaterialMovementDispatches
            .AsNoTracking()
            .Where(d => d.MovementId == id)
            .Select(d => new MaterialMovementDispatchResponse
            {
                Id = d.Id,
                DispatchedByUserId = d.DispatchedByUserId,
                DispatchedByUserName = d.DispatchedByUser.FullName,
                DispatchedAt = d.DispatchedAt,
                TransporterId = d.TransporterId,
                TransporterName = d.Transporter != null ? d.Transporter.Name : null,
                VehicleNumber = d.VehicleNumber,
                GatePassNumber = d.GatePassNumber,
                HasGatePassPdf = d.GatePassPdfPath != null
            })
            .FirstOrDefaultAsync();

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

        // MaterialMovementAuditLogs is ON DELETE RESTRICT by design, so a
        // submitted/approved/rejected movement's history can never
        // silently disappear - but a still-Draft movement always has at
        // least its "Created" entry (and possibly "Updated" ones from
        // edits), which would otherwise block every single draft
        // deletion outright with a foreign-key violation. A draft being
        // deleted was never submitted, so there is no approval history
        // worth preserving; clear its own audit trail along with it.
        // This is only reachable here because the Status == "Draft"
        // check above guarantees no Submitted/Approved/etc. entries
        // exist for this movement yet. Same reasoning, and same fix, as
        // PurchaseRequisitionService.DeleteDraftAsync.
        var draftAuditLogs = await _context.MaterialMovementAuditLogs
            .Where(a => a.MovementId == id)
            .ToListAsync();
        _context.MaterialMovementAuditLogs.RemoveRange(draftAuditLogs);

        // MaterialMovementItems cascade-deletes at the database level
        // (ON DELETE CASCADE), so removing the movement itself is enough
        // for those - no orphaned-history risk either, since a Draft
        // never has approvals/dispatch/receipt rows (those don't exist
        // until submission, a later phase).
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

    // In-app only (bell icon / Notifications) - Material Movement
    // approvers are always existing logged-in Users, unlike Purchase
    // Requisition's external Contacts, so there's no need for the
    // token-link email infrastructure PR uses. Same shape as
    // PurchaseRequisitionService.AddNotification.
    private void AddNotification(
        int userId,
        string type,
        string title,
        string message,
        int movementId)
    {
        _context.Notifications.Add(new Models.Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityType = "MaterialMovement",
            RelatedEntityId = movementId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
    }

    // =========================================================
    // SUBMIT
    // =========================================================

    public async Task<MaterialMovementResponse?> SubmitAsync(
        int id,
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
                "You can only submit your own movements.");

        if (movement.Status != "Draft")
            throw new InvalidOperationException(
                "Only Draft movements can be submitted.");

        // Highest-Priority (lowest number = evaluated first) active
        // workflow whose MovementType/company pair matches, per
        // MaterialApprovalWorkflow.cs's class comment. MinValue/MaxValue
        // are deliberately NOT evaluated here - there's no monetary value
        // anywhere reachable from a movement or its items (MaterialItem/
        // Asset have no price field), so a value-bounded workflow can
        // never be correctly matched today. Only workflows with both
        // bounds null are considered; a value-scoped workflow silently
        // never matches, which is a known v1 limitation, not a bug to
        // chase here.
        var workflow = await _context.MaterialApprovalWorkflows
            .Include(w => w.Steps)
            .Where(w => w.IsActive)
            .Where(w => w.MinValue == null && w.MaxValue == null)
            .Where(w => w.MovementType == null || w.MovementType == movement.MovementType)
            .Where(w => w.FromCompanyId == null || w.FromCompanyId == movement.FromCompanyId)
            .Where(w => w.ToCompanyId == null || w.ToCompanyId == movement.ToCompanyId)
            .OrderBy(w => w.Priority)
            .FirstOrDefaultAsync();

        if (workflow == null)
            throw new InvalidOperationException(
                "No approval workflow is configured for this movement type/entity " +
                "combination - ask an admin to set one up under Approval Workflows.");

        var orderedSteps = workflow.Steps.OrderBy(s => s.StepOrder).ToList();

        // v1 only supports named-user steps (see MaterialApprovalWorkflowStep.cs's
        // comment on Role/Department resolution) - a Role/Department step
        // here means the admin configured something this phase can't
        // resolve to a single approver yet.
        var unresolvedStep = orderedSteps.FirstOrDefault(s => !s.ApproverUserId.HasValue);

        if (unresolvedStep != null)
            throw new InvalidOperationException(
                $"Approval workflow \"{workflow.Name}\" has a Role/Department-based step " +
                $"(stage {unresolvedStep.StepOrder}) - only named-user steps are supported " +
                "right now. Ask an admin to edit that workflow to use named users.");

        if (orderedSteps.Count == 0)
            throw new InvalidOperationException(
                $"Approval workflow \"{workflow.Name}\" has no steps configured - " +
                "ask an admin to add at least one approval step.");

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var movementNumber = await GenerateUniqueMovementNumberAsync();

            movement.MovementNumber = movementNumber;
            movement.Status = "PendingApproval";
            movement.ApprovalWorkflowId = workflow.Id;
            movement.CurrentApprovalStepOrder = orderedSteps[0].StepOrder;
            movement.RequestedAt = DateTime.UtcNow;
            movement.UpdatedAt = DateTime.UtcNow;

            foreach (var step in orderedSteps)
            {
                _context.MaterialMovementApprovals.Add(new Models.MaterialMovementApproval
                {
                    MovementId = movement.Id,
                    StepOrder = step.StepOrder,
                    ApproverUserId = step.ApproverUserId,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                });
            }

            AddAuditLog(movement.Id, "Submitted", requestedByUserId, ipAddress: ipAddress);

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }

        var firstStepApproverId = orderedSteps[0].ApproverUserId!.Value;
        var requester = await _context.Users.FindAsync(requestedByUserId);

        AddNotification(
            firstStepApproverId,
            "MaterialMovementApprovalNeeded",
            "Material movement needs your approval",
            $"{requester?.FullName ?? "A user"} is waiting on your approval for " +
            $"{movement.MovementNumber} ({movement.MovementType}).",
            movement.Id);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, requestedByUserId, isPrivileged: false);
    }

    private async Task<string> GenerateUniqueMovementNumberAsync()
    {
        var prefix = $"MAT-{DateTime.UtcNow.Year}-";

        // Same max-existing-suffix-plus-one lookup as
        // PurchaseRequisitionService.GenerateUniquePrNumberAsync - no DB
        // sequence exists in this codebase's style. The unique index on
        // MovementNumber is the actual safety net against a race between
        // two concurrent submits.
        var existingSuffixes = await _context.MaterialMovements
            .Where(x => x.MovementNumber != null && x.MovementNumber.StartsWith(prefix))
            .Select(x => x.MovementNumber!.Substring(prefix.Length))
            .ToListAsync();

        var nextSeq = existingSuffixes
            .Select(s => int.TryParse(s, out var seq) ? seq : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextSeq:D6}";
    }

    // =========================================================
    // APPROVE / REJECT
    // =========================================================

    public Task<MaterialMovementResponse?> ApproveAsync(
        int id,
        int decidingUserId,
        DecideMaterialMovementRequest request,
        string? ipAddress) =>
        DecideAsync(id, decidingUserId, approve: true, request, ipAddress);

    public Task<MaterialMovementResponse?> RejectAsync(
        int id,
        int decidingUserId,
        DecideMaterialMovementRequest request,
        string? ipAddress) =>
        DecideAsync(id, decidingUserId, approve: false, request, ipAddress);

    private async Task<MaterialMovementResponse?> DecideAsync(
        int id,
        int decidingUserId,
        bool approve,
        DecideMaterialMovementRequest request,
        string? ipAddress)
    {
        var movement = await _context.MaterialMovements
            .Include(m => m.Approvals)
            .FirstOrDefaultAsync(m => m.Id == id);

        if (movement == null)
            return null;

        if (movement.Status != "PendingApproval")
            throw new InvalidOperationException(
                "This movement is not currently awaiting approval.");

        var currentApproval = movement.Approvals
            .FirstOrDefault(a => a.StepOrder == movement.CurrentApprovalStepOrder);

        if (currentApproval == null)
            throw new InvalidOperationException(
                "This movement's current approval step could not be found.");

        if (currentApproval.ApproverUserId != decidingUserId)
            throw new UnauthorizedAccessException(
                "This step must be decided by its assigned approver.");

        currentApproval.Status = approve ? "Approved" : "Rejected";
        currentApproval.ActionedAt = DateTime.UtcNow;
        currentApproval.Comments = string.IsNullOrWhiteSpace(request.Comments)
            ? null
            : request.Comments.Trim();

        AddAuditLog(
            movement.Id,
            approve ? "StepApproved" : "StepRejected",
            decidingUserId,
            details: $"Stage {currentApproval.StepOrder}" +
                (string.IsNullOrWhiteSpace(currentApproval.Comments)
                    ? string.Empty
                    : $": {currentApproval.Comments}"),
            ipAddress: ipAddress);

        int notifyUserId;
        string notifyType;
        string notifyTitle;
        string notifyMessage;

        if (!approve)
        {
            movement.Status = "Rejected";
            movement.UpdatedAt = DateTime.UtcNow;

            notifyUserId = movement.RequestedByUserId;
            notifyType = "MaterialMovementRejected";
            notifyTitle = "Material movement rejected";
            notifyMessage = $"Your movement {movement.MovementNumber} was rejected at " +
                $"stage {currentApproval.StepOrder}" +
                (string.IsNullOrWhiteSpace(currentApproval.Comments)
                    ? "." : $": {currentApproval.Comments}");
        }
        else
        {
            var nextApproval = movement.Approvals
                .Where(a => a.StepOrder > currentApproval.StepOrder)
                .OrderBy(a => a.StepOrder)
                .FirstOrDefault();

            if (nextApproval == null)
            {
                movement.Status = "Approved";
                movement.CurrentApprovalStepOrder = null;
                movement.UpdatedAt = DateTime.UtcNow;

                notifyUserId = movement.RequestedByUserId;
                notifyType = "MaterialMovementApproved";
                notifyTitle = "Material movement approved";
                notifyMessage = $"Your movement {movement.MovementNumber} has been " +
                    "fully approved and is ready to dispatch.";
            }
            else
            {
                movement.CurrentApprovalStepOrder = nextApproval.StepOrder;
                movement.UpdatedAt = DateTime.UtcNow;

                notifyUserId = nextApproval.ApproverUserId!.Value;
                notifyType = "MaterialMovementApprovalNeeded";
                notifyTitle = "Material movement needs your approval";
                notifyMessage = $"Movement {movement.MovementNumber} is waiting on your " +
                    $"approval (stage {nextApproval.StepOrder}).";
            }
        }

        AddNotification(notifyUserId, notifyType, notifyTitle, notifyMessage, movement.Id);

        await _context.SaveChangesAsync();

        // isPrivileged: true here, not a real role check - the decider
        // was just allowed to act on this exact step (checked above), but
        // by the time we re-fetch, CurrentApprovalStepOrder may already
        // have moved past them (approved -> advanced to the next stage)
        // so GetByIdAsync's own isAssignedApprover check would no longer
        // recognize them and would otherwise throw on their own
        // just-completed action. Having been allowed to decide IS the
        // authorization for seeing the result.
        return await GetByIdAsync(id, decidingUserId, isPrivileged: true);
    }

    public async Task<IEnumerable<MaterialMovementListItemResponse>> GetPendingMyApprovalAsync(
        int userId)
    {
        return await _context.MaterialMovements
            .AsNoTracking()
            .Where(m => m.Status == "PendingApproval")
            .Where(m => m.Approvals.Any(a =>
                a.StepOrder == m.CurrentApprovalStepOrder &&
                a.ApproverUserId == userId &&
                a.Status == "Pending"))
            .OrderBy(m => m.RequestedAt)
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

    // =========================================================
    // DISPATCH / GATE PASS
    // =========================================================

    public async Task<MaterialMovementResponse?> DispatchAsync(
        int id,
        int dispatchedByUserId,
        DispatchMaterialMovementRequest request,
        string? ipAddress)
    {
        var movement = await _context.MaterialMovements
            .FirstOrDefaultAsync(m => m.Id == id);

        if (movement == null)
            return null;

        if (movement.Status != "Approved")
            throw new InvalidOperationException(
                "Only fully-approved movements can be dispatched.");

        var alreadyDispatched = await _context.MaterialMovementDispatches
            .AnyAsync(d => d.MovementId == id);

        if (alreadyDispatched)
            throw new InvalidOperationException(
                "This movement has already been dispatched.");

        if (request.TransporterId.HasValue)
        {
            var transporterExists = await _context.MaterialTransporters
                .AnyAsync(t => t.Id == request.TransporterId.Value && t.IsActive);

            if (!transporterExists)
                throw new InvalidOperationException(
                    "Selected transporter does not exist or is inactive.");
        }

        var gatePassNumber = await GenerateUniqueGatePassNumberAsync();

        var dispatch = new Models.MaterialMovementDispatch
        {
            MovementId = movement.Id,
            DispatchedByUserId = dispatchedByUserId,
            DispatchedAt = DateTime.UtcNow,
            TransporterId = request.TransporterId,
            VehicleNumber = NullIfBlank(request.VehicleNumber),
            GatePassNumber = gatePassNumber,
            CreatedAt = DateTime.UtcNow
        };

        _context.MaterialMovementDispatches.Add(dispatch);

        movement.Status = "Dispatched";
        movement.UpdatedAt = DateTime.UtcNow;

        // This movement type is treated as an RGP (Returnable Gate Pass) -
        // open the round-trip tracking row here, at dispatch time, rather
        // than waiting for a return to actually happen. Matches
        // MaterialMovementReturn.cs's own doc comment ("created alongside
        // the movement's dispatch"). Guarded with an existence check so
        // this stays safe to run even if a Return row somehow already
        // exists (shouldn't happen via this path, but AlreadyDispatched
        // above already guarantees Dispatch itself only runs once).
        if (movement.MovementType == "TemporaryMovement")
        {
            var alreadyHasReturnRow = await _context.MaterialMovementReturns
                .AnyAsync(r => r.MovementId == movement.Id);

            if (!alreadyHasReturnRow)
            {
                _context.MaterialMovementReturns.Add(new Models.MaterialMovementReturn
                {
                    MovementId = movement.Id,
                    ExpectedReturnDate = movement.ExpectedReturnDate ?? DateTime.UtcNow,
                    Status = "Pending",
                    CreatedAt = DateTime.UtcNow
                });
            }
        }

        AddAuditLog(movement.Id, "Dispatched", dispatchedByUserId,
            details: $"Gate pass {gatePassNumber}", ipAddress: ipAddress);

        await _context.SaveChangesAsync();

        AddNotification(
            movement.RequestedByUserId,
            "MaterialMovementDispatched",
            "Material movement dispatched",
            $"Your movement {movement.MovementNumber} has been dispatched " +
            $"(gate pass {gatePassNumber}).",
            movement.Id);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id, dispatchedByUserId, isPrivileged: true);
    }

    private async Task<string> GenerateUniqueGatePassNumberAsync()
    {
        var prefix = $"GP-{DateTime.UtcNow.Year}-";

        var existingSuffixes = await _context.MaterialMovementDispatches
            .Where(x => x.GatePassNumber != null && x.GatePassNumber.StartsWith(prefix))
            .Select(x => x.GatePassNumber!.Substring(prefix.Length))
            .ToListAsync();

        var nextSeq = existingSuffixes
            .Select(s => int.TryParse(s, out var seq) ? seq : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextSeq:D6}";
    }

    /*
     * Loads every navigation MaterialMovementGatePassPdfDocument reads
     * (From/To Company/Location, Vendor, RequestedByUser, Items with
     * Item/Asset, Approvals with ApproverUser, the Dispatch row with
     * DispatchedByUser/Transporter, and - for TemporaryMovement only - a
     * MaterialMovementReturn row if one exists) and renders the PDF -
     * same best-effort, never-throws-to-the-caller shape as
     * PurchaseRequisitionService.GenerateAndStorePdfAsync, since a PDF
     * hiccup must never undo an already-committed Dispatch.
     */
    private async Task GenerateAndStoreGatePassPdfAsync(
        int movementId,
        string pdfStorageRootPath)
    {
        try
        {
            var movement = await _context.MaterialMovements
                .Include(m => m.FromCompany)
                .Include(m => m.FromLocation)
                .Include(m => m.ToCompany)
                .Include(m => m.ToLocation)
                .Include(m => m.Vendor)
                .Include(m => m.RequestedByUser)
                .Include(m => m.Items).ThenInclude(i => i.Item)
                .Include(m => m.Items).ThenInclude(i => i.Asset)
                .Include(m => m.Approvals).ThenInclude(a => a.ApproverUser)
                .FirstOrDefaultAsync(m => m.Id == movementId);

            if (movement == null)
                return;

            var dispatch = await _context.MaterialMovementDispatches
                .Include(d => d.DispatchedByUser)
                .Include(d => d.Transporter)
                .FirstOrDefaultAsync(d => d.MovementId == movementId);

            if (dispatch == null)
                return; // not actually dispatched - nothing to generate yet

            // Nothing writes MaterialMovementReturn rows yet (that's later-
            // phase work - see that model's own comment), so this is null
            // for every movement today; the PDF's Return Tracking section
            // already handles null gracefully ("Not Yet Returned"). Kept as
            // a real query rather than always passing null so the PDF picks
            // up real data automatically the moment a return action exists.
            var returnRecord = await _context.MaterialMovementReturns
                .Include(r => r.ReturnedByUser)
                .FirstOrDefaultAsync(r => r.MovementId == movementId);

            var directory = Path.Combine(
                pdfStorageRootPath, "material-movements", movement.Id.ToString());

            Directory.CreateDirectory(directory);

            var safeFileNameBase = (dispatch.GatePassNumber ?? movement.Id.ToString())
                .Replace('/', '-')
                .Replace('\\', '-');

            var fileName = $"{safeFileNameBase}.pdf";
            var destination = Path.Combine(directory, fileName);

            new MaterialMovementGatePassPdfDocument(movement, dispatch, returnRecord)
                .GeneratePdf(destination);

            dispatch.GatePassPdfPath = $"material-movements/{movement.Id}/{fileName}";

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to generate the gate pass PDF for material movement {MovementId}.",
                movementId);
        }
    }

    // Lazy/self-healing, same reasoning as
    // PurchaseRequisitionService.GetPdfFileAsync - a Dispatched movement
    // missing its PDF (never generated, or the file's since gone missing)
    // gets one generated here, at download time, before serving it.
    public async Task<(string PhysicalPath, string FileName)?> GetGatePassPdfFileAsync(
        int id,
        string pdfStorageRootPath)
    {
        var dispatch = await _context.MaterialMovementDispatches
            .FirstOrDefaultAsync(d => d.MovementId == id);

        if (dispatch == null)
            return null;

        string? physicalPath = string.IsNullOrWhiteSpace(dispatch.GatePassPdfPath)
            ? null
            : Path.Combine(
                pdfStorageRootPath,
                dispatch.GatePassPdfPath.Replace('/', Path.DirectorySeparatorChar));

        if (physicalPath == null || !File.Exists(physicalPath))
        {
            await GenerateAndStoreGatePassPdfAsync(id, pdfStorageRootPath);

            dispatch = await _context.MaterialMovementDispatches
                .AsNoTracking()
                .FirstOrDefaultAsync(d => d.MovementId == id);

            if (string.IsNullOrWhiteSpace(dispatch?.GatePassPdfPath))
                return null; // generation itself failed - see backend logs

            physicalPath = Path.Combine(
                pdfStorageRootPath,
                dispatch.GatePassPdfPath.Replace('/', Path.DirectorySeparatorChar));
        }

        if (!File.Exists(physicalPath))
            return null;

        return (physicalPath, Path.GetFileName(physicalPath));
    }

    // =========================================================
    // RGP (RETURNABLE GATE PASS) TRACKING
    // =========================================================

    public async Task<RgpTrackingResponse> GetRgpTrackingAsync()
    {
        // Starting from Dispatches (not Movements) means this naturally
        // only ever includes movements that have actually left the
        // building - a still-Draft/PendingApproval/Approved
        // TemporaryMovement isn't an outstanding RGP yet.
        var dispatches = await _context.MaterialMovementDispatches
            .AsNoTracking()
            .Where(d => d.Movement.MovementType == "TemporaryMovement")
            .Select(d => new
            {
                d.MovementId,
                MovementNumber = d.Movement.MovementNumber,
                d.DispatchedAt,
                d.GatePassNumber,
                ExpectedReturnDate = d.Movement.ExpectedReturnDate,
                RequestedByUserName = d.Movement.RequestedByUser.FullName,
                FromSummary = d.Movement.FromLocation != null
                    ? d.Movement.FromLocation.LocationName
                    : (d.Movement.FromCompany != null ? d.Movement.FromCompany.Name : null),
                ToSummary = d.Movement.ToLocation != null
                    ? d.Movement.ToLocation.LocationName
                    : (d.Movement.ToCompany != null ? d.Movement.ToCompany.Name : null)
            })
            .ToListAsync();

        var movementIds = dispatches.Select(d => d.MovementId).ToList();

        var returnsList = await _context.MaterialMovementReturns
            .AsNoTracking()
            .Where(r => movementIds.Contains(r.MovementId))
            .ToListAsync();

        var returnsByMovementId = returnsList.ToDictionary(r => r.MovementId);

        var today = DateTime.UtcNow.Date;
        var items = new List<RgpTrackingItemResponse>();

        foreach (var d in dispatches)
        {
            returnsByMovementId.TryGetValue(d.MovementId, out var returnRecord);

            // TemporaryMovement always requires ExpectedReturnDate at
            // create time (see ValidateAndNormalizeAsync) - the
            // DispatchedAt fallback below only guards against pre-existing
            // data from before that validation existed.
            var expectedReturnDate = d.ExpectedReturnDate ?? d.DispatchedAt;

            string returnStatus;
            var daysOverdue = 0;

            if (returnRecord != null && returnRecord.Status == "Returned")
            {
                returnStatus = "Returned";
            }
            else if (expectedReturnDate.Date < today)
            {
                // Computed live against today's date, not a stored/
                // scheduled status - see this method's interface doc
                // comment.
                returnStatus = "Overdue";
                daysOverdue = (today - expectedReturnDate.Date).Days;
            }
            else
            {
                returnStatus = "Pending";
            }

            items.Add(new RgpTrackingItemResponse
            {
                Id = d.MovementId,
                MovementNumber = d.MovementNumber,
                GatePassNumber = d.GatePassNumber,
                FromSummary = d.FromSummary,
                ToSummary = d.ToSummary,
                RequestedByUserName = d.RequestedByUserName,
                DispatchedAt = d.DispatchedAt,
                ExpectedReturnDate = expectedReturnDate,
                ActualReturnDate = returnRecord?.ActualReturnDate,
                ReturnStatus = returnStatus,
                DaysOverdue = daysOverdue
            });
        }

        // Outstanding (Pending/Overdue) first, soonest/most-overdue expected
        // date first within each group - the operationally useful order for
        // a logistics/security desk chasing returns.
        var ordered = items
            .OrderBy(i => i.ReturnStatus == "Returned" ? 1 : 0)
            .ThenBy(i => i.ExpectedReturnDate)
            .ToList();

        return new RgpTrackingResponse
        {
            Summary = new RgpTrackingSummaryResponse
            {
                TotalCount = items.Count,
                PendingCount = items.Count(i => i.ReturnStatus == "Pending"),
                OverdueCount = items.Count(i => i.ReturnStatus == "Overdue"),
                ReturnedCount = items.Count(i => i.ReturnStatus == "Returned")
            },
            Items = ordered
        };
    }

    public async Task<MaterialMovementResponse?> MarkReturnedAsync(
        int id,
        int returnedByUserId,
        string? remarks,
        string? ipAddress)
    {
        var movement = await _context.MaterialMovements
            .FirstOrDefaultAsync(m => m.Id == id);

        if (movement == null)
            return null;

        if (movement.MovementType != "TemporaryMovement")
            throw new InvalidOperationException(
                "Only Temporary Movements (RGP) can be marked returned.");

        var dispatched = await _context.MaterialMovementDispatches
            .AnyAsync(d => d.MovementId == id);

        if (!dispatched)
            throw new InvalidOperationException(
                "This movement has not been dispatched yet.");

        var returnRecord = await _context.MaterialMovementReturns
            .FirstOrDefaultAsync(r => r.MovementId == id);

        if (returnRecord != null && returnRecord.Status == "Returned")
            throw new InvalidOperationException(
                "This movement has already been marked returned.");

        // Normally DispatchAsync already created this row (Status =
        // "Pending") - this branch only covers a movement dispatched
        // before that existed.
        if (returnRecord == null)
        {
            returnRecord = new Models.MaterialMovementReturn
            {
                MovementId = id,
                ExpectedReturnDate = movement.ExpectedReturnDate ?? DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.MaterialMovementReturns.Add(returnRecord);
        }

        var trimmedRemarks = string.IsNullOrWhiteSpace(remarks) ? null : remarks.Trim();

        returnRecord.Status = "Returned";
        returnRecord.ActualReturnDate = DateTime.UtcNow;
        returnRecord.ReturnedByUserId = returnedByUserId;
        returnRecord.ReturnedAt = DateTime.UtcNow;
        returnRecord.Remarks = trimmedRemarks;

        movement.Status = "TemporaryReturned";
        movement.UpdatedAt = DateTime.UtcNow;

        AddAuditLog(movement.Id, "Returned", returnedByUserId,
            details: trimmedRemarks, ipAddress: ipAddress);

        AddNotification(
            movement.RequestedByUserId,
            "MaterialMovementReturned",
            "Temporary movement marked returned",
            $"Your temporarily moved material for {movement.MovementNumber ?? $"#{movement.Id}"} " +
            "has been marked as returned.",
            movement.Id);

        await _context.SaveChangesAsync();

        // isPrivileged: true - same "having been allowed to act IS the
        // authorization for viewing the result" reasoning as DecideAsync/
        // DispatchAsync's own final GetByIdAsync calls. Marking an RGP
        // returned is a privileged (Super Admin/IT Admin) action at the
        // controller level, so the caller is never the movement's owner
        // by default.
        return await GetByIdAsync(id, returnedByUserId, isPrivileged: true);
    }

    // =========================================================
    // SYSTEM-LOGGED MOVEMENTS (Work From Home via Asset Reallocation)
    // =========================================================

    /*
     * "DirectOutward"/"DirectInward" only - see IMaterialMovementService's
     * doc comment. Caller (AssetReallocationRequestService) already owns
     * its own Super Admin + IT Admin dual approval, so this bypasses
     * Draft/approval entirely and lands straight on Completed. Every
     * failure path returns null rather than throwing - the reallocation
     * that triggered this must never fail because logging a movement
     * record for it didn't work out.
     */
    public async Task<MaterialMovementResponse?> CreateSystemLoggedMovementAsync(
        string movementType,
        int assetId,
        int requestedByUserId,
        string purpose)
    {
        if (movementType != "DirectOutward" && movementType != "DirectInward")
            throw new ArgumentOutOfRangeException(
                nameof(movementType),
                "CreateSystemLoggedMovementAsync only supports DirectOutward/DirectInward.");

        var asset = await _context.Assets
            .Include(a => a.CurrentLocation)
            .FirstOrDefaultAsync(a => a.Id == assetId);

        if (asset?.CurrentLocation == null)
            return null; // nothing to log without a known location

        var item = await _context.MaterialItems
            .FirstOrDefaultAsync(i => i.MaterialType == "ITAsset" && i.IsSerialized);

        if (item == null)
            return null; // no MaterialItem catalog entry to attach this asset line to yet

        var movement = new Models.MaterialMovement
        {
            MovementType = movementType,
            Status = "Completed",
            MovementNumber = await GenerateUniqueMovementNumberAsync(),

            FromCompanyId = movementType == "DirectOutward" ? asset.CurrentLocation.CompanyId : null,
            FromLocationId = movementType == "DirectOutward" ? asset.CurrentLocationId : null,

            ToCompanyId = movementType == "DirectInward" ? asset.CurrentLocation.CompanyId : null,
            ToLocationId = movementType == "DirectInward" ? asset.CurrentLocationId : null,

            RequestedByUserId = requestedByUserId,
            RequestedAt = DateTime.UtcNow,
            Purpose = purpose,
            CreatedAt = DateTime.UtcNow,

            Items = new List<Models.MaterialMovementItem>
            {
                new()
                {
                    ItemId = item.Id,
                    AssetId = asset.Id,
                    Quantity = 1m,
                    CreatedAt = DateTime.UtcNow
                }
            }
        };

        _context.MaterialMovements.Add(movement);

        await _context.SaveChangesAsync();

        AddAuditLog(movement.Id, "SystemLogged", requestedByUserId, details: purpose);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(movement.Id, requestedByUserId, isPrivileged: true);
    }
}
