using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Phase 3 (PR Creation) of the Purchase Requisition module - owns the
 * requester-facing lifecycle up through Submit: Create/Update/Delete a
 * Draft, manage its attachments, and Submit it into the approval engine
 * (Phase 4 owns everything from "a step gets decided" onward).
 *
 * Every write path re-checks Status == "Draft" and RequestedByUserId ==
 * the caller before mutating - the database trigger from the
 * AddPurchaseRequisitionModule migration is a second, independent layer
 * that blocks mutation of an Approved PR's core fields/line items even if
 * a bug ever let a request past this service-layer check.
 */
public class PurchaseRequisitionService : IPurchaseRequisitionService
{
    private const long MaxAttachmentSizeBytes = 15 * 1024 * 1024;

    private static readonly string[] AllowedAttachmentExtensions =
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".docx", ".xlsx"
    };

    private static readonly string[] AllowedAttachmentTypes =
    {
        "VendorQuotation", "Supporting"
    };

    private readonly ApplicationDbContext _context;

    public PurchaseRequisitionService(ApplicationDbContext context)
    {
        _context = context;
    }


    // =========================================================
    // QUERY / MAPPING
    // =========================================================

    private IQueryable<Models.PurchaseRequisition> Query()
    {
        return _context.PurchaseRequisitions
            .Include(x => x.Company)
            .Include(x => x.Department)
            .Include(x => x.RequestedByUser)
            .Include(x => x.LineItems)
            .Include(x => x.Attachments)
                .ThenInclude(x => x.UploadedByUser)
            .Include(x => x.ApprovalSteps)
                .ThenInclude(x => x.AssignedApproverUser);
    }

    private static PurchaseRequisitionResponse Map(
        Models.PurchaseRequisition r,
        int currentUserId)
    {
        return new PurchaseRequisitionResponse
        {
            Id = r.Id,
            PrNumber = r.PrNumber,

            CompanyId = r.CompanyId,
            CompanyName = r.Company?.Name,

            DepartmentId = r.DepartmentId,
            DepartmentName = r.Department?.DepartmentName ?? string.Empty,

            RequestedByUserId = r.RequestedByUserId,
            RequestedByUserName = r.RequestedByUser?.FullName ?? string.Empty,

            Title = r.Title,
            Justification = r.Justification,
            Status = r.Status,

            RequiredApprovalStageCount = r.RequiredApprovalStageCount,
            CurrentApprovalStepOrder = r.CurrentApprovalStepOrder,

            Currency = r.Currency,
            SubtotalAmount = r.SubtotalAmount,
            TaxAmount = r.TaxAmount,
            TotalAmount = r.TotalAmount,

            SubmittedAt = r.SubmittedAt,
            ApprovedAt = r.ApprovedAt,
            RejectedAt = r.RejectedAt,

            PdfPath = r.PdfPath,
            PdfGeneratedAt = r.PdfGeneratedAt,

            CreatedAt = r.CreatedAt,
            UpdatedAt = r.UpdatedAt,

            IsOwner = r.RequestedByUserId == currentUserId,

            LineItems = r.LineItems
                .OrderBy(li => li.LineNumber)
                .Select(li => new PurchaseRequisitionLineItemResponse
                {
                    Id = li.Id,
                    LineNumber = li.LineNumber,
                    ItemDescription = li.ItemDescription,
                    Category = li.Category,
                    Quantity = li.Quantity,
                    UnitOfMeasure = li.UnitOfMeasure,
                    UnitPrice = li.UnitPrice,
                    LineTotal = li.LineTotal,
                    Notes = li.Notes
                })
                .ToList(),

            Attachments = r.Attachments
                .OrderBy(a => a.UploadedAt)
                .Select(a => new PurchaseRequisitionAttachmentResponse
                {
                    Id = a.Id,
                    AttachmentType = a.AttachmentType,
                    FileName = a.FileName,
                    StoredPath = a.StoredPath,
                    ContentType = a.ContentType,
                    FileSizeBytes = a.FileSizeBytes,
                    UploadedByUserId = a.UploadedByUserId,
                    UploadedByUserName = a.UploadedByUser?.FullName,
                    UploadedAt = a.UploadedAt
                })
                .ToList(),

            ApprovalSteps = r.ApprovalSteps
                .OrderBy(s => s.StepOrder)
                .Select(s => new PurchaseRequisitionApprovalStepResponse
                {
                    Id = s.Id,
                    StepOrder = s.StepOrder,
                    AssignedApproverUserId = s.AssignedApproverUserId,
                    AssignedApproverUserName =
                        s.AssignedApproverUser?.FullName ?? string.Empty,
                    Status = s.Status,
                    DecidedAt = s.DecidedAt,
                    Remarks = s.Remarks
                })
                .ToList()
        };
    }

    public async Task<IEnumerable<PurchaseRequisitionListItemResponse>>
        GetMineAsync(int requestedByUserId)
    {
        var records = await _context.PurchaseRequisitions
            .Include(x => x.Department)
            .Include(x => x.LineItems)
            .Where(x => x.RequestedByUserId == requestedByUserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(r => new PurchaseRequisitionListItemResponse
        {
            Id = r.Id,
            PrNumber = r.PrNumber,
            Title = r.Title,
            DepartmentName = r.Department?.DepartmentName ?? string.Empty,
            Status = r.Status,
            Currency = r.Currency,
            TotalAmount = r.TotalAmount,
            LineItemCount = r.LineItems.Count,
            CreatedAt = r.CreatedAt,
            SubmittedAt = r.SubmittedAt
        });
    }

    public async Task<PurchaseRequisitionResponse?> GetByIdAsync(
        int id,
        int requestingUserId,
        bool isPrivileged)
    {
        var record = await Query().FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        var isOwner = record.RequestedByUserId == requestingUserId;
        var isAssignedApprover = record.ApprovalSteps
            .Any(s => s.AssignedApproverUserId == requestingUserId);

        if (!isOwner && !isPrivileged && !isAssignedApprover)
            throw new UnauthorizedAccessException(
                "You don't have access to this purchase requisition.");

        return Map(record, requestingUserId);
    }


    // =========================================================
    // CREATE / UPDATE DRAFT
    // =========================================================

    private async Task<(Department department, decimal subtotal, decimal tax, decimal total)>
        ValidateAndComputeAsync(
            SavePurchaseRequisitionRequest request,
            List<PurchaseRequisitionLineItem> lineItems)
    {
        var department = await _context.Departments
            .FirstOrDefaultAsync(x => x.Id == request.DepartmentId);

        if (department == null || !department.IsActive)
            throw new InvalidOperationException(
                "Selected department does not exist or is inactive.");

        lineItems.Clear();

        var lineNumber = 1;
        decimal subtotal = 0m;

        foreach (var item in request.LineItems)
        {
            var lineTotal = Math.Round(
                item.Quantity * item.UnitPrice,
                2,
                MidpointRounding.AwayFromZero);

            lineItems.Add(new PurchaseRequisitionLineItem
            {
                LineNumber = lineNumber++,
                ItemDescription = item.ItemDescription,
                Category = item.Category,
                Quantity = item.Quantity,
                UnitOfMeasure = item.UnitOfMeasure,
                UnitPrice = item.UnitPrice,
                LineTotal = lineTotal,
                Notes = item.Notes
            });

            subtotal += lineTotal;
        }

        var tax = request.TaxAmount.HasValue
            ? Math.Round(request.TaxAmount.Value, 2, MidpointRounding.AwayFromZero)
            : 0m;

        var total = subtotal + tax;

        return (department, subtotal, tax, total);
    }

    public async Task<PurchaseRequisitionResponse> CreateDraftAsync(
        SavePurchaseRequisitionRequest request,
        int requestedByUserId)
    {
        var requestedBy = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == requestedByUserId);

        if (requestedBy == null || !requestedBy.IsActive)
            throw new InvalidOperationException(
                "Requesting user not found or inactive.");

        var lineItems = new List<PurchaseRequisitionLineItem>();

        var (department, subtotal, tax, total) =
            await ValidateAndComputeAsync(request, lineItems);

        var record = new Models.PurchaseRequisition
        {
            CompanyId = department.CompanyId,
            DepartmentId = department.Id,
            RequestedByUserId = requestedByUserId,
            Title = request.Title,
            Justification = request.Justification,
            Status = "Draft",
            Currency = string.IsNullOrWhiteSpace(request.Currency)
                ? "INR"
                : request.Currency.Trim().ToUpperInvariant(),
            SubtotalAmount = subtotal,
            TaxAmount = tax,
            TotalAmount = total,
            CreatedAt = DateTime.UtcNow,
            LineItems = lineItems
        };

        _context.PurchaseRequisitions.Add(record);

        await _context.SaveChangesAsync();

        AddAuditLog(record.Id, "Created", requestedByUserId);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(record.Id, requestedByUserId, isPrivileged: false)
            ?? throw new InvalidOperationException(
                "Unable to load created purchase requisition.");
    }

    public async Task<PurchaseRequisitionResponse?> UpdateDraftAsync(
        int id,
        SavePurchaseRequisitionRequest request,
        int requestedByUserId)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.LineItems)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        if (record.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only edit your own purchase requisitions.");

        if (record.Status != "Draft")
            throw new InvalidOperationException(
                "Only Draft purchase requisitions can be edited.");

        // Replace the whole line-item set - simplest correct behavior for
        // a "save the whole document" form; EF tracks the removal of the
        // old rows via the navigation collection reassignment below.
        _context.PurchaseRequisitionLineItems.RemoveRange(record.LineItems);

        var lineItems = new List<PurchaseRequisitionLineItem>();

        var (department, subtotal, tax, total) =
            await ValidateAndComputeAsync(request, lineItems);

        record.CompanyId = department.CompanyId;
        record.DepartmentId = department.Id;
        record.Title = request.Title;
        record.Justification = request.Justification;
        record.Currency = string.IsNullOrWhiteSpace(request.Currency)
            ? "INR"
            : request.Currency.Trim().ToUpperInvariant();
        record.SubtotalAmount = subtotal;
        record.TaxAmount = tax;
        record.TotalAmount = total;
        record.UpdatedAt = DateTime.UtcNow;
        record.LineItems = lineItems;

        await _context.SaveChangesAsync();

        AddAuditLog(record.Id, "Updated", requestedByUserId);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(record.Id, requestedByUserId, isPrivileged: false);
    }

    public async Task<bool> DeleteDraftAsync(
        int id,
        int requestedByUserId,
        string webRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.Attachments)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        if (record.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only delete your own purchase requisitions.");

        if (record.Status != "Draft")
            throw new InvalidOperationException(
                "Only Draft purchase requisitions can be deleted.");

        foreach (var attachment in record.Attachments)
        {
            DeletePhysicalFile(webRootPath, attachment.StoredPath);
        }

        // Line items/attachments/approval steps all cascade-delete with
        // the parent row (see AddPurchaseRequisitionModule migration).
        _context.PurchaseRequisitions.Remove(record);

        await _context.SaveChangesAsync();

        return true;
    }


    // =========================================================
    // ATTACHMENTS
    // =========================================================

    public async Task<PurchaseRequisitionAttachmentResponse> UploadAttachmentAsync(
        int id,
        IFormFile file,
        string attachmentType,
        int uploadedByUserId,
        string webRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            throw new InvalidOperationException(
                "Purchase requisition not found.");

        if (record.RequestedByUserId != uploadedByUserId)
            throw new UnauthorizedAccessException(
                "You can only add attachments to your own purchase requisitions.");

        if (record.Status != "Draft")
            throw new InvalidOperationException(
                "Attachments can only be added while the purchase requisition is a Draft.");

        if (!AllowedAttachmentTypes.Contains(attachmentType))
            throw new InvalidOperationException(
                "Attachment type must be VendorQuotation or Supporting.");

        if (file == null || file.Length == 0)
            throw new InvalidOperationException(
                "Please select a file to upload.");

        if (file.Length > MaxAttachmentSizeBytes)
            throw new InvalidOperationException(
                "Attachments must not exceed 15 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!AllowedAttachmentExtensions.Contains(extension))
            throw new InvalidOperationException(
                "Only PDF, JPG, PNG, DOCX, and XLSX attachments are allowed.");

        await ValidateFileSignatureAsync(file, extension);

        var uploadDirectory = Path.Combine(
            webRootPath, "uploads", "purchase-requisitions", id.ToString());

        Directory.CreateDirectory(uploadDirectory);

        var generatedFileName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(uploadDirectory, generatedFileName);

        await using (var output = new FileStream(
            destination, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(output);
        }

        var attachment = new PurchaseRequisitionAttachment
        {
            PurchaseRequisitionId = id,
            AttachmentType = attachmentType,
            FileName = Path.GetFileName(file.FileName),
            StoredPath = $"/uploads/purchase-requisitions/{id}/{generatedFileName}",
            ContentType = string.IsNullOrWhiteSpace(file.ContentType)
                ? "application/octet-stream"
                : file.ContentType,
            FileSizeBytes = file.Length,
            UploadedByUserId = uploadedByUserId,
            UploadedAt = DateTime.UtcNow
        };

        _context.PurchaseRequisitionAttachments.Add(attachment);

        try
        {
            await _context.SaveChangesAsync();
        }
        catch
        {
            if (File.Exists(destination))
                File.Delete(destination);

            throw;
        }

        AddAuditLog(id, "AttachmentUploaded", uploadedByUserId,
            $"{attachment.FileName} ({attachmentType})");
        await _context.SaveChangesAsync();

        var uploadedByUser = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == uploadedByUserId);

        return new PurchaseRequisitionAttachmentResponse
        {
            Id = attachment.Id,
            AttachmentType = attachment.AttachmentType,
            FileName = attachment.FileName,
            StoredPath = attachment.StoredPath,
            ContentType = attachment.ContentType,
            FileSizeBytes = attachment.FileSizeBytes,
            UploadedByUserId = attachment.UploadedByUserId,
            UploadedByUserName = uploadedByUser?.FullName,
            UploadedAt = attachment.UploadedAt
        };
    }

    public async Task<bool> DeleteAttachmentAsync(
        int id,
        int attachmentId,
        int requestedByUserId,
        string webRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return false;

        if (record.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only remove attachments from your own purchase requisitions.");

        if (record.Status != "Draft")
            throw new InvalidOperationException(
                "Attachments can only be removed while the purchase requisition is a Draft.");

        var attachment = await _context.PurchaseRequisitionAttachments
            .FirstOrDefaultAsync(x =>
                x.Id == attachmentId && x.PurchaseRequisitionId == id);

        if (attachment == null)
            return false;

        DeletePhysicalFile(webRootPath, attachment.StoredPath);

        _context.PurchaseRequisitionAttachments.Remove(attachment);

        AddAuditLog(id, "AttachmentRemoved", requestedByUserId, attachment.FileName);

        await _context.SaveChangesAsync();

        return true;
    }

    private static void DeletePhysicalFile(string webRootPath, string storedPath)
    {
        var relativePath = storedPath
            .TrimStart('/')
            .Replace('/', Path.DirectorySeparatorChar);

        var fullPath = Path.Combine(webRootPath, relativePath);

        if (File.Exists(fullPath))
            File.Delete(fullPath);
    }

    private static async Task ValidateFileSignatureAsync(IFormFile file, string extension)
    {
        byte[] header = new byte[8];

        using (var stream = file.OpenReadStream())
        {
            var bytesRead = await stream.ReadAsync(header.AsMemory(0, header.Length));

            if (bytesRead < 4)
                throw new InvalidOperationException("The uploaded file is invalid.");
        }

        var isPdf = header[0] == 0x25 && header[1] == 0x50 &&
                    header[2] == 0x44 && header[3] == 0x46; // %PDF

        var isPng = header[0] == 0x89 && header[1] == 0x50 &&
                    header[2] == 0x4E && header[3] == 0x47;

        var isJpeg = header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF;

        // .docx/.xlsx are both OOXML (zip-based); a PK\x03\x04 signature
        // confirms it's a valid zip container, matching the level of
        // verification this codebase already applies elsewhere (the
        // floor-map upload distinguishes PNG/JPEG by signature but
        // doesn't parse inside them either) - it doesn't disambiguate a
        // relabeled .docx from a relabeled .xlsx, both are equally
        // low-risk office documents.
        var isZip = header[0] == 0x50 && header[1] == 0x4B &&
                    header[2] == 0x03 && header[3] == 0x04;

        var signatureMatches = extension switch
        {
            ".pdf" => isPdf,
            ".png" => isPng,
            ".jpg" or ".jpeg" => isJpeg,
            ".docx" or ".xlsx" => isZip,
            _ => false
        };

        if (!signatureMatches)
            throw new InvalidOperationException(
                "The file extension does not match the file's actual format.");
    }


    // =========================================================
    // SUBMIT
    // =========================================================

    public async Task<PurchaseRequisitionResponse?> SubmitAsync(
        int id,
        SubmitPurchaseRequisitionRequest request,
        int requestedByUserId)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.Company)
            .Include(x => x.LineItems)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        if (record.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only submit your own purchase requisitions.");

        if (record.Status != "Draft")
            throw new InvalidOperationException(
                "This purchase requisition has already been submitted.");

        if (record.LineItems.Count == 0)
            throw new InvalidOperationException(
                "Add at least one line item before submitting.");

        var stages = request.ApprovalStages
            .OrderBy(s => s.StepOrder)
            .ToList();

        var expectedOrders = Enumerable.Range(1, stages.Count);

        if (!stages.Select(s => s.StepOrder).SequenceEqual(expectedOrders))
            throw new InvalidOperationException(
                "Approval stages must be numbered 1..N with no gaps or repeats.");

        var approverIds = stages.Select(s => s.ApproverUserId).ToList();

        if (approverIds.Contains(requestedByUserId))
            throw new InvalidOperationException(
                "You cannot assign yourself as an approver on your own requisition.");

        var approvers = await _context.Users
            .Where(u => approverIds.Contains(u.Id))
            .ToListAsync();

        foreach (var stage in stages)
        {
            var approver = approvers.FirstOrDefault(u => u.Id == stage.ApproverUserId);

            if (approver == null || !approver.IsActive)
                throw new InvalidOperationException(
                    $"The approver selected for stage {stage.StepOrder} is invalid or inactive.");
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        try
        {
            var prNumber = await GenerateUniquePrNumberAsync(record);

            record.PrNumber = prNumber;
            record.Status = "InApproval";
            record.RequiredApprovalStageCount = stages.Count;
            record.CurrentApprovalStepOrder = stages[0].StepOrder;
            record.SubmittedAt = DateTime.UtcNow;
            record.UpdatedAt = DateTime.UtcNow;

            foreach (var stage in stages)
            {
                _context.PurchaseRequisitionApprovalSteps.Add(
                    new PurchaseRequisitionApprovalStep
                    {
                        PurchaseRequisitionId = record.Id,
                        StepOrder = stage.StepOrder,
                        AssignedApproverUserId = stage.ApproverUserId,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    });
            }

            AddAuditLog(record.Id, "Submitted", requestedByUserId,
                $"PR number {prNumber}, {stages.Count} approval stage(s).");

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
        catch (DbUpdateException)
        {
            await transaction.RollbackAsync();
            throw new InvalidOperationException(
                "Could not generate a unique PR number - please try submitting again.");
        }

        return await GetByIdAsync(record.Id, requestedByUserId, isPrivileged: false);
    }

    private async Task<string> GenerateUniquePrNumberAsync(Models.PurchaseRequisition record)
    {
        var companyCode = string.IsNullOrWhiteSpace(record.Company?.Code)
            ? $"C{record.CompanyId}"
            : record.Company!.Code!.Trim().ToUpperInvariant();

        var prefix = $"PR-{companyCode}-{DateTime.UtcNow.Year}-";

        // No DB sequence exists in this codebase's style (see
        // PR_MODULE_ARCHITECTURE_PROPOSAL.md) - fall back to a
        // max-existing-suffix-plus-one lookup. The unique index on
        // PrNumber is the actual safety net against a race between two
        // concurrent submits; SubmitAsync's caller retries the whole
        // request if SaveChangesAsync throws on a collision.
        var existingSuffixes = await _context.PurchaseRequisitions
            .Where(x => x.PrNumber != null && x.PrNumber.StartsWith(prefix))
            .Select(x => x.PrNumber!.Substring(prefix.Length))
            .ToListAsync();

        var nextSeq = existingSuffixes
            .Select(s => int.TryParse(s, out var seq) ? seq : 0)
            .DefaultIfEmpty(0)
            .Max() + 1;

        return $"{prefix}{nextSeq:D4}";
    }

    private void AddAuditLog(
        int purchaseRequisitionId,
        string action,
        int? performedByUserId,
        string? details = null)
    {
        _context.PurchaseRequisitionAuditLogs.Add(new PurchaseRequisitionAuditLog
        {
            PurchaseRequisitionId = purchaseRequisitionId,
            Action = action,
            PerformedByUserId = performedByUserId,
            PerformedVia = "WebApp",
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
    }


    // =========================================================
    // APPROVER CANDIDATES
    // =========================================================

    public async Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetApproverCandidatesAsync(int requestingUserId)
    {
        var requester = await _context.Users
            .Include(x => x.Department)
            .FirstOrDefaultAsync(x => x.Id == requestingUserId);

        if (requester == null)
            throw new InvalidOperationException("Requesting user not found.");

        var companyId = requester.CompanyId ?? requester.Department?.CompanyId;

        if (companyId == null)
            throw new InvalidOperationException(
                "Unable to determine your company - contact an administrator.");

        var candidates = await _context.Users
            .Include(x => x.Department)
            .Where(u =>
                u.IsActive &&
                u.Id != requestingUserId &&
                (u.CompanyId == companyId ||
                 (u.DepartmentId != null && u.Department!.CompanyId == companyId)))
            .OrderBy(u => u.FullName)
            .ToListAsync();

        return candidates.Select(u => new PurchaseRequisitionApproverCandidateResponse
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            DepartmentName = u.Department?.DepartmentName
        });
    }


    // =========================================================
    // APPROVAL ENGINE (Phase 4)
    // =========================================================

    public async Task<IEnumerable<PurchaseRequisitionPendingApprovalResponse>>
        GetPendingApprovalsAsync(int approverUserId)
    {
        var records = await _context.PurchaseRequisitions
            .Include(x => x.Department)
            .Include(x => x.RequestedByUser)
            .Include(x => x.ApprovalSteps)
            .Where(x =>
                x.Status == "InApproval" &&
                x.ApprovalSteps.Any(s =>
                    s.StepOrder == x.CurrentApprovalStepOrder &&
                    s.Status == "Pending" &&
                    s.AssignedApproverUserId == approverUserId))
            .OrderBy(x => x.SubmittedAt)
            .ToListAsync();

        return records.Select(r => new PurchaseRequisitionPendingApprovalResponse
        {
            Id = r.Id,
            PrNumber = r.PrNumber,
            Title = r.Title,
            DepartmentName = r.Department?.DepartmentName ?? string.Empty,
            RequestedByUserName = r.RequestedByUser?.FullName ?? string.Empty,
            StepOrder = r.CurrentApprovalStepOrder ?? 0,
            RequiredApprovalStageCount = r.RequiredApprovalStageCount,
            Currency = r.Currency,
            TotalAmount = r.TotalAmount,
            SubmittedAt = r.SubmittedAt
        });
    }

    /*
     * Decides the step matching CurrentApprovalStepOrder - never a
     * client-supplied step id, so there's no way to decide a step that
     * isn't currently "live". A rejection at any stage immediately
     * rejects the whole requisition and flips every still-Pending future
     * stage to Skipped (see PurchaseRequisitionApprovalStep's model
     * comment); an approval either advances CurrentApprovalStepOrder to
     * the next stage, or - on the final stage - marks the whole
     * requisition Approved. This method intentionally does NOT generate
     * a PDF or notify Finance on final approval - that's Phase 6/7.
     */
    public async Task<PurchaseRequisitionResponse?> DecideStepAsync(
        int id,
        DecidePurchaseRequisitionStepRequest request,
        int decidingUserId)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.ApprovalSteps)
            .Include(x => x.RequestedByUser)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        if (record.Status != "InApproval")
            throw new InvalidOperationException(
                "This purchase requisition is not currently awaiting approval.");

        var currentStep = record.ApprovalSteps
            .FirstOrDefault(s => s.StepOrder == record.CurrentApprovalStepOrder);

        if (currentStep == null)
            throw new InvalidOperationException(
                "No active approval step was found for this purchase requisition.");

        if (currentStep.AssignedApproverUserId != decidingUserId)
            throw new UnauthorizedAccessException(
                "You are not the assigned approver for the current stage of this purchase requisition.");

        if (currentStep.Status != "Pending")
            throw new InvalidOperationException(
                "This approval stage has already been decided.");

        if (!request.Approve && string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException(
                "Remarks are required when rejecting a purchase requisition.");

        var now = DateTime.UtcNow;
        currentStep.DecidedAt = now;
        currentStep.Remarks = request.Remarks;

        int notifyUserId;
        string notifyType;
        string notifyTitle;
        string notifyMessage;

        var prLabel = record.PrNumber ?? $"#{record.Id}";

        if (request.Approve)
        {
            currentStep.Status = "Approved";

            var nextStep = record.ApprovalSteps
                .Where(s => s.StepOrder > currentStep.StepOrder)
                .OrderBy(s => s.StepOrder)
                .FirstOrDefault();

            if (nextStep == null)
            {
                // Final stage approved - the whole requisition is now
                // Approved. The immutability trigger only blocks further
                // updates once a row's PREVIOUS status was already
                // Approved, so this transition itself is unaffected by it.
                record.Status = "Approved";
                record.ApprovedAt = now;
                record.CurrentApprovalStepOrder = null;
                record.UpdatedAt = now;

                AddAuditLog(record.Id, "FullyApproved", decidingUserId,
                    $"Stage {currentStep.StepOrder} approved - all stages complete.");

                notifyUserId = record.RequestedByUserId;
                notifyType = "PurchaseRequisitionApproved";
                notifyTitle = "Purchase requisition approved";
                notifyMessage =
                    $"Your purchase requisition {prLabel} ({record.Title}) has been fully approved.";
            }
            else
            {
                record.CurrentApprovalStepOrder = nextStep.StepOrder;
                record.UpdatedAt = now;

                AddAuditLog(record.Id, "StepApproved", decidingUserId,
                    $"Stage {currentStep.StepOrder} approved - advanced to stage {nextStep.StepOrder}.");

                notifyUserId = nextStep.AssignedApproverUserId;
                notifyType = "PurchaseRequisitionApprovalNeeded";
                notifyTitle = "Purchase requisition needs your approval";
                notifyMessage =
                    $"{record.RequestedByUser?.FullName ?? "A user"} is waiting on your approval for {prLabel} ({record.Title}).";
            }
        }
        else
        {
            currentStep.Status = "Rejected";
            record.Status = "Rejected";
            record.RejectedAt = now;
            record.CurrentApprovalStepOrder = null;
            record.UpdatedAt = now;

            foreach (var futureStep in record.ApprovalSteps
                .Where(s => s.StepOrder > currentStep.StepOrder && s.Status == "Pending"))
            {
                futureStep.Status = "Skipped";
            }

            AddAuditLog(record.Id, "StepRejected", decidingUserId,
                $"Stage {currentStep.StepOrder} rejected: {request.Remarks}");

            notifyUserId = record.RequestedByUserId;
            notifyType = "PurchaseRequisitionRejected";
            notifyTitle = "Purchase requisition rejected";
            notifyMessage =
                $"Your purchase requisition {prLabel} ({record.Title}) was rejected at stage {currentStep.StepOrder}: {request.Remarks}";
        }

        await _context.SaveChangesAsync();

        AddNotification(notifyUserId, notifyType, notifyTitle, notifyMessage, record.Id);
        await _context.SaveChangesAsync();

        return await GetByIdAsync(record.Id, decidingUserId, isPrivileged: false);
    }

    private void AddNotification(
        int userId,
        string type,
        string title,
        string message,
        int purchaseRequisitionId)
    {
        _context.Notifications.Add(new Notification
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            RelatedEntityType = "PurchaseRequisition",
            RelatedEntityId = purchaseRequisitionId,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        });
    }
}
