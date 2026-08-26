using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.MaterialApprovalWorkflow;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class MaterialApprovalWorkflowService : IMaterialApprovalWorkflowService
{
    // InternalTransfer, InterEntityTransfer, OutwardToVendor,
    // InwardFromVendor, TemporaryMovement, DirectInward, DirectOutward -
    // per MaterialMovement.cs's doc comment. Null (not sent) means "matches
    // every movement type" and is allowed.
    public static readonly string[] AllowedMovementTypes =
    {
        "InternalTransfer",
        "InterEntityTransfer",
        "OutwardToVendor",
        "InwardFromVendor",
        "TemporaryMovement",
        "DirectInward",
        "DirectOutward"
    };

    // Must match the backend Roles table / AppRole names on the frontend
    // (lib/auth/roles.ts's KNOWN_ROLES).
    //
    // "Facility" (added for the QR-driven material movement transfer/
    // receive flow, renamed from "Security" once it became clear that's
    // who actually does this job) is listed here for completeness/future
    // use, but a Role-typed approval step doesn't actually function yet -
    // see the v1 restriction to named-user-only steps in
    // MaterialMovementService.SubmitAsync. It becomes meaningful
    // automatically if that restriction is ever lifted.
    public static readonly string[] AllowedApproverRoles =
    {
        "Super Admin",
        "IT Admin",
        "Team Lead",
        "Manager",
        "Employee",
        "Facility"
    };

    public static readonly string[] AllowedApproverTypes =
    {
        "Role",
        "User",
        "Department"
    };

    private readonly ApplicationDbContext _context;

    public MaterialApprovalWorkflowService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<MaterialApprovalWorkflowResponse>> GetAllAsync()
    {
        return await _context.MaterialApprovalWorkflows
            .AsNoTracking()
            .OrderBy(w => w.Priority)
            .ThenBy(w => w.Name)
            .Select(w => new MaterialApprovalWorkflowResponse
            {
                Id = w.Id,
                Name = w.Name,
                MovementType = w.MovementType,
                MinValue = w.MinValue,
                MaxValue = w.MaxValue,
                FromCompanyId = w.FromCompanyId,
                FromCompanyName = w.FromCompany != null ? w.FromCompany.Name : null,
                ToCompanyId = w.ToCompanyId,
                ToCompanyName = w.ToCompany != null ? w.ToCompany.Name : null,
                RequiresItAssetLine = w.RequiresItAssetLine,
                IsActive = w.IsActive,
                Priority = w.Priority,
                CreatedAt = w.CreatedAt,
                UpdatedAt = w.UpdatedAt,
                Steps = w.Steps
                    .OrderBy(s => s.StepOrder)
                    .Select(s => new MaterialApprovalWorkflowStepResponse
                    {
                        Id = s.Id,
                        StepOrder = s.StepOrder,
                        ApproverType = s.ApproverUserId != null
                            ? "User"
                            : s.ApproverDepartmentId != null
                                ? "Department"
                                : "Role",
                        ApproverRole = s.ApproverRole,
                        ApproverUserId = s.ApproverUserId,
                        ApproverUserName = s.ApproverUser != null ? s.ApproverUser.FullName : null,
                        ApproverDepartmentId = s.ApproverDepartmentId,
                        ApproverDepartmentName = s.ApproverDepartment != null ? s.ApproverDepartment.DepartmentName : null,
                        IsMandatory = s.IsMandatory
                    })
                    .ToList()
            })
            .ToListAsync();
    }

    public async Task<MaterialApprovalWorkflowResponse?> GetByIdAsync(int id)
    {
        return await _context.MaterialApprovalWorkflows
            .AsNoTracking()
            .Where(w => w.Id == id)
            .Select(w => new MaterialApprovalWorkflowResponse
            {
                Id = w.Id,
                Name = w.Name,
                MovementType = w.MovementType,
                MinValue = w.MinValue,
                MaxValue = w.MaxValue,
                FromCompanyId = w.FromCompanyId,
                FromCompanyName = w.FromCompany != null ? w.FromCompany.Name : null,
                ToCompanyId = w.ToCompanyId,
                ToCompanyName = w.ToCompany != null ? w.ToCompany.Name : null,
                RequiresItAssetLine = w.RequiresItAssetLine,
                IsActive = w.IsActive,
                Priority = w.Priority,
                CreatedAt = w.CreatedAt,
                UpdatedAt = w.UpdatedAt,
                Steps = w.Steps
                    .OrderBy(s => s.StepOrder)
                    .Select(s => new MaterialApprovalWorkflowStepResponse
                    {
                        Id = s.Id,
                        StepOrder = s.StepOrder,
                        ApproverType = s.ApproverUserId != null
                            ? "User"
                            : s.ApproverDepartmentId != null
                                ? "Department"
                                : "Role",
                        ApproverRole = s.ApproverRole,
                        ApproverUserId = s.ApproverUserId,
                        ApproverUserName = s.ApproverUser != null ? s.ApproverUser.FullName : null,
                        ApproverDepartmentId = s.ApproverDepartmentId,
                        ApproverDepartmentName = s.ApproverDepartment != null ? s.ApproverDepartment.DepartmentName : null,
                        IsMandatory = s.IsMandatory
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync();
    }

    public async Task<MaterialApprovalWorkflowResponse> CreateAsync(
        CreateMaterialApprovalWorkflowRequest request)
    {
        var name = request.Name.Trim();
        var movementType = ValidateMovementType(request.MovementType);

        ValidateValueRange(request.MinValue, request.MaxValue);

        await EnsureCompanyExistsAsync(request.FromCompanyId);
        await EnsureCompanyExistsAsync(request.ToCompanyId);

        var steps = await BuildStepsAsync(request.Steps);

        var workflow = new Models.MaterialApprovalWorkflow
        {
            Name = name,
            MovementType = movementType,
            MinValue = request.MinValue,
            MaxValue = request.MaxValue,
            FromCompanyId = request.FromCompanyId,
            ToCompanyId = request.ToCompanyId,
            RequiresItAssetLine = request.RequiresItAssetLine,
            Priority = request.Priority,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            Steps = steps
        };

        _context.MaterialApprovalWorkflows.Add(workflow);

        await _context.SaveChangesAsync();

        return await GetByIdAsync(workflow.Id)
            ?? throw new Exception(
                "Unable to load created approval workflow.");
    }

    public async Task<MaterialApprovalWorkflowResponse?> UpdateAsync(
        int id,
        UpdateMaterialApprovalWorkflowRequest request)
    {
        var workflow = await _context.MaterialApprovalWorkflows
            .Include(w => w.Steps)
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
            return null;

        var name = request.Name.Trim();
        var movementType = ValidateMovementType(request.MovementType);

        ValidateValueRange(request.MinValue, request.MaxValue);

        await EnsureCompanyExistsAsync(request.FromCompanyId);
        await EnsureCompanyExistsAsync(request.ToCompanyId);

        var steps = await BuildStepsAsync(request.Steps);

        // Replace the whole step set - simplest correct behavior for a
        // "save the whole document" form, same convention as Purchase
        // Requisition line items (PurchaseRequisitionService.
        // UpdateDraftAsync).
        _context.MaterialApprovalWorkflowSteps.RemoveRange(workflow.Steps);

        workflow.Name = name;
        workflow.MovementType = movementType;
        workflow.MinValue = request.MinValue;
        workflow.MaxValue = request.MaxValue;
        workflow.FromCompanyId = request.FromCompanyId;
        workflow.ToCompanyId = request.ToCompanyId;
        workflow.RequiresItAssetLine = request.RequiresItAssetLine;
        workflow.Priority = request.Priority;
        workflow.IsActive = request.IsActive;
        workflow.UpdatedAt = DateTime.UtcNow;
        workflow.Steps = steps;

        await _context.SaveChangesAsync();

        return await GetByIdAsync(id);
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var workflow = await _context.MaterialApprovalWorkflows
            .FirstOrDefaultAsync(w => w.Id == id);

        if (workflow == null)
            return false;

        workflow.IsActive = false;
        workflow.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return true;
    }

    private async Task<List<Models.MaterialApprovalWorkflowStep>> BuildStepsAsync(
        List<MaterialApprovalWorkflowStepRequest> stepRequests)
    {
        var steps = new List<Models.MaterialApprovalWorkflowStep>();
        var stepOrder = 1;

        foreach (var stepRequest in stepRequests)
        {
            var approverType = (stepRequest.ApproverType ?? string.Empty).Trim();

            if (!AllowedApproverTypes.Contains(approverType))
                throw new InvalidOperationException(
                    $"Invalid approver type on step {stepOrder}. Allowed values: {string.Join(", ", AllowedApproverTypes)}.");

            string? approverRole = null;
            int? approverUserId = null;
            int? approverDepartmentId = null;

            switch (approverType)
            {
                case "Role":
                    if (string.IsNullOrWhiteSpace(stepRequest.ApproverRole))
                        throw new InvalidOperationException(
                            $"Step {stepOrder} must specify an approver role.");

                    approverRole = stepRequest.ApproverRole.Trim();

                    if (!AllowedApproverRoles.Contains(approverRole))
                        throw new InvalidOperationException(
                            $"Invalid approver role on step {stepOrder}. Allowed values: {string.Join(", ", AllowedApproverRoles)}.");

                    break;

                case "User":
                    if (!stepRequest.ApproverUserId.HasValue)
                        throw new InvalidOperationException(
                            $"Step {stepOrder} must specify an approver user.");

                    var userExists = await _context.Users
                        .AnyAsync(u => u.Id == stepRequest.ApproverUserId.Value);

                    if (!userExists)
                        throw new InvalidOperationException(
                            $"Step {stepOrder}'s approver user does not exist.");

                    approverUserId = stepRequest.ApproverUserId;

                    break;

                case "Department":
                    if (!stepRequest.ApproverDepartmentId.HasValue)
                        throw new InvalidOperationException(
                            $"Step {stepOrder} must specify an approver department.");

                    var departmentExists = await _context.Departments
                        .AnyAsync(d => d.Id == stepRequest.ApproverDepartmentId.Value);

                    if (!departmentExists)
                        throw new InvalidOperationException(
                            $"Step {stepOrder}'s approver department does not exist.");

                    approverDepartmentId = stepRequest.ApproverDepartmentId;

                    break;
            }

            steps.Add(new Models.MaterialApprovalWorkflowStep
            {
                StepOrder = stepOrder,
                ApproverRole = approverRole,
                ApproverUserId = approverUserId,
                ApproverDepartmentId = approverDepartmentId,
                IsMandatory = stepRequest.IsMandatory,
                CreatedAt = DateTime.UtcNow
            });

            stepOrder++;
        }

        return steps;
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

    private static string? ValidateMovementType(string? movementType)
    {
        if (string.IsNullOrWhiteSpace(movementType))
            return null;

        var trimmed = movementType.Trim();

        if (!AllowedMovementTypes.Contains(trimmed))
            throw new InvalidOperationException(
                $"Invalid movement type. Allowed values: {string.Join(", ", AllowedMovementTypes)}.");

        return trimmed;
    }

    private static void ValidateValueRange(decimal? minValue, decimal? maxValue)
    {
        if (minValue.HasValue && maxValue.HasValue && minValue.Value > maxValue.Value)
            throw new InvalidOperationException(
                "Minimum value cannot be greater than maximum value.");
    }
}
