using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.PurchaseRequisition;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;
using QuestPDF.Fluent;

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

    // How long a secure email approval link stays usable before the
    // approver has to fall back to signing in and using the Pending
    // Approvals page instead.
    private const int ApprovalTokenValidityDays = 14;

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<PurchaseRequisitionService> _logger;
    private readonly string _publicBaseUrl;

    public PurchaseRequisitionService(
        ApplicationDbContext context,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<PurchaseRequisitionService> logger)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;

        // Base URL the frontend is reachable at, used to build secure
        // approval links embedded in emails (e.g. "{base}/pr-approval/
        // {token}"). Configurable via App:PublicBaseUrl (or the
        // App__PublicBaseUrl environment variable in docker-compose) so
        // it can be updated without another code change if the domain
        // changes.
        _publicBaseUrl = (configuration["App:PublicBaseUrl"]
            ?? "http://localhost:5173").TrimEnd('/');
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
            .Include(x => x.InitiatedByContact)
            .Include(x => x.Vendor)
            .Include(x => x.LineItems)
            .Include(x => x.Attachments)
                .ThenInclude(x => x.UploadedByUser)
            .Include(x => x.ApprovalSteps)
                .ThenInclude(x => x.AssignedApproverUser)
            .Include(x => x.ApprovalSteps)
                .ThenInclude(x => x.AssignedApproverContact);
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

            VendorId = r.VendorId,
            VendorName = r.Vendor?.VendorName,

            RequestedByUserId = r.RequestedByUserId,
            RequestedByUserName = r.RequestedByUser?.FullName ?? string.Empty,

            InitiatedByContactId = r.InitiatedByContactId,
            InitiatedByContactName = r.InitiatedByContact?.FullName,

            Title = r.Title,
            Justification = r.Justification,
            Status = r.Status,

            RequiredApprovalStageCount = r.RequiredApprovalStageCount,
            CurrentApprovalStepOrder = r.CurrentApprovalStepOrder,

            Currency = r.Currency,
            SubtotalAmount = r.SubtotalAmount,
            CgstPercent = r.CgstPercent,
            SgstPercent = r.SgstPercent,
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
                    AssignedApproverContactId = s.AssignedApproverContactId,
                    ApproverType = s.AssignedApproverContactId.HasValue ? "Contact" : "User",
                    AssignedApproverUserName = s.AssignedApproverContactId.HasValue
                        ? (s.AssignedApproverContact?.FullName ?? string.Empty)
                        : (s.AssignedApproverUser?.FullName ?? string.Empty),
                    AssignedApproverEmail = s.AssignedApproverContactId.HasValue
                        ? s.AssignedApproverContact?.Email
                        : s.AssignedApproverUser?.Email,
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
            .Include(x => x.Company)
            .Include(x => x.LineItems)
            .Where(x => x.RequestedByUserId == requestedByUserId)
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync();

        return records.Select(r => new PurchaseRequisitionListItemResponse
        {
            Id = r.Id,
            PrNumber = r.PrNumber,
            Title = r.Title,
            CompanyName = r.Company?.Name ?? string.Empty,
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

    private async Task<(Company company, Models.Vendor? vendor, decimal subtotal, decimal cgstPercent, decimal sgstPercent, decimal tax, decimal total)>
        ValidateAndComputeAsync(
            SavePurchaseRequisitionRequest request,
            List<PurchaseRequisitionLineItem> lineItems)
    {
        var company = await _context.Companies
            .FirstOrDefaultAsync(x => x.Id == request.CompanyId);

        if (company == null || !company.IsActive)
            throw new InvalidOperationException(
                "Selected entity does not exist or is inactive.");

        Models.Vendor? vendor = null;

        if (request.VendorId.HasValue)
        {
            vendor = await _context.Vendors
                .FirstOrDefaultAsync(x => x.Id == request.VendorId.Value);

            if (vendor == null || !vendor.IsActive)
                throw new InvalidOperationException(
                    "Selected vendor does not exist or is inactive.");
        }

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

        // CGST + SGST (India's split GST scheme) rather than a single flat
        // amount - both default to the standard 9% each (18% combined)
        // when omitted from the request, but are changeable per PR. The
        // [Range(0, 100)] annotations on the request DTO reject anything
        // outside a sane percentage before this method even runs.
        var cgstPercent = request.CgstPercent ?? 9m;
        var sgstPercent = request.SgstPercent ?? 9m;

        var tax = Math.Round(
            subtotal * (cgstPercent + sgstPercent) / 100m,
            2,
            MidpointRounding.AwayFromZero);

        var total = subtotal + tax;

        return (company, vendor, subtotal, cgstPercent, sgstPercent, tax, total);
    }

    /*
     * "Initiated by" is optional, purely informational metadata (see
     * PurchaseRequisition.InitiatedByContactId's model comment) - when
     * set, it must reference an active Contact whose ContactType allows
     * initiating ("Initiator" or "Both"), same active/type-scoping
     * convention as approver validation below.
     */
    private async Task<int?> ValidateInitiatorContactAsync(int? initiatedByContactId)
    {
        if (!initiatedByContactId.HasValue)
            return null;

        var contact = await _context.PurchaseRequisitionContacts
            .FirstOrDefaultAsync(c => c.Id == initiatedByContactId.Value);

        if (contact == null || !contact.IsActive ||
            (contact.ContactType != "Initiator" && contact.ContactType != "Both"))
            throw new InvalidOperationException(
                "The selected initiator contact does not exist or is inactive.");

        return contact.Id;
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

        var (company, vendor, subtotal, cgstPercent, sgstPercent, tax, total) =
            await ValidateAndComputeAsync(request, lineItems);

        var initiatedByContactId = await ValidateInitiatorContactAsync(request.InitiatedByContactId);

        var record = new Models.PurchaseRequisition
        {
            CompanyId = company.Id,
            VendorId = vendor?.Id,
            RequestedByUserId = requestedByUserId,
            InitiatedByContactId = initiatedByContactId,
            Title = request.Title,
            Justification = request.Justification,
            Status = "Draft",
            Currency = string.IsNullOrWhiteSpace(request.Currency)
                ? "INR"
                : request.Currency.Trim().ToUpperInvariant(),
            SubtotalAmount = subtotal,
            CgstPercent = cgstPercent,
            SgstPercent = sgstPercent,
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

        var (company, vendor, subtotal, cgstPercent, sgstPercent, tax, total) =
            await ValidateAndComputeAsync(request, lineItems);

        record.InitiatedByContactId = await ValidateInitiatorContactAsync(request.InitiatedByContactId);

        record.CompanyId = company.Id;
        record.VendorId = vendor?.Id;
        record.Title = request.Title;
        record.Justification = request.Justification;
        record.Currency = string.IsNullOrWhiteSpace(request.Currency)
            ? "INR"
            : request.Currency.Trim().ToUpperInvariant();
        record.SubtotalAmount = subtotal;
        record.CgstPercent = cgstPercent;
        record.SgstPercent = sgstPercent;
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

        // PurchaseRequisitionAuditLogs is ON DELETE RESTRICT by design, so
        // a submitted/approved/rejected PR's history can never silently
        // disappear - but a still-Draft PR always has at least its
        // "Created" entry (and possibly "Updated" ones from edits), which
        // would otherwise block every single draft deletion outright. A
        // draft that's being deleted was never submitted, so there is no
        // approval history worth preserving; clear its own audit trail
        // along with it. This is only reachable here because the Status
        // == "Draft" check above guarantees no Submitted/StepApproved/
        // FullyApproved/etc. entries exist for this PR yet.
        var draftAuditLogs = await _context.PurchaseRequisitionAuditLogs
            .Where(x => x.PurchaseRequisitionId == id)
            .ToListAsync();
        _context.PurchaseRequisitionAuditLogs.RemoveRange(draftAuditLogs);

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
            .Include(x => x.RequestedByUser)
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

        // Each stage's approver is either an existing system User or a
        // standalone Contact (external, no login) - exactly one of
        // ApproverUserId/ApproverContactId must be set, mirroring the DB
        // CHECK constraint on PurchaseRequisitionApprovalSteps (data
        // annotations can't express an XOR across two nullable properties).
        foreach (var stage in stages)
        {
            var hasUser = stage.ApproverUserId.HasValue;
            var hasContact = stage.ApproverContactId.HasValue;

            if (hasUser == hasContact)
                throw new InvalidOperationException(
                    $"Stage {stage.StepOrder} must have exactly one approver selected.");
        }

        var approverUserIds = stages
            .Where(s => s.ApproverUserId.HasValue)
            .Select(s => s.ApproverUserId!.Value)
            .ToList();

        var approverContactIds = stages
            .Where(s => s.ApproverContactId.HasValue)
            .Select(s => s.ApproverContactId!.Value)
            .ToList();

        if (approverUserIds.Contains(requestedByUserId))
            throw new InvalidOperationException(
                "You cannot assign yourself as an approver on your own requisition.");

        var approvers = await _context.Users
            .Where(u => approverUserIds.Contains(u.Id))
            .ToListAsync();

        var approverContacts = await _context.PurchaseRequisitionContacts
            .Where(c => approverContactIds.Contains(c.Id))
            .ToListAsync();

        foreach (var stage in stages)
        {
            if (stage.ApproverUserId.HasValue)
            {
                var approver = approvers.FirstOrDefault(u => u.Id == stage.ApproverUserId.Value);

                if (approver == null || !approver.IsActive)
                    throw new InvalidOperationException(
                        $"The approver selected for stage {stage.StepOrder} is invalid or inactive.");
            }
            else
            {
                var contact = approverContacts.FirstOrDefault(c => c.Id == stage.ApproverContactId!.Value);

                if (contact == null || !contact.IsActive ||
                    (contact.ContactType != "Approver" && contact.ContactType != "Both"))
                    throw new InvalidOperationException(
                        $"The approver selected for stage {stage.StepOrder} is invalid or inactive.");
            }
        }

        await using var transaction = await _context.Database.BeginTransactionAsync();

        var createdSteps = new List<PurchaseRequisitionApprovalStep>();

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
                PurchaseRequisitionApprovalStep step;

                if (stage.ApproverUserId.HasValue)
                {
                    var approver = approvers.First(u => u.Id == stage.ApproverUserId.Value);

                    step = new PurchaseRequisitionApprovalStep
                    {
                        PurchaseRequisitionId = record.Id,
                        StepOrder = stage.StepOrder,
                        AssignedApproverUserId = approver.Id,
                        AssignedApproverUser = approver,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    };
                }
                else
                {
                    var contact = approverContacts.First(c => c.Id == stage.ApproverContactId!.Value);

                    step = new PurchaseRequisitionApprovalStep
                    {
                        PurchaseRequisitionId = record.Id,
                        StepOrder = stage.StepOrder,
                        AssignedApproverContactId = contact.Id,
                        AssignedApproverContact = contact,
                        Status = "Pending",
                        CreatedAt = DateTime.UtcNow
                    };
                }

                _context.PurchaseRequisitionApprovalSteps.Add(step);
                createdSteps.Add(step);
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

        // Issue a secure approval token and email the first-stage approver
        // now that the submit transaction has committed. A failure here
        // (e.g. a future real email provider being unreachable) must not
        // undo the successful submit - IssueTokenAndSendApprovalRequestEmailAsync
        // swallows and logs its own errors.
        var firstStep = createdSteps.First(s => s.StepOrder == record.CurrentApprovalStepOrder);
        await IssueTokenAndSendApprovalRequestEmailAsync(record, firstStep);

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
        string? details = null,
        string performedVia = "WebApp")
    {
        _context.PurchaseRequisitionAuditLogs.Add(new PurchaseRequisitionAuditLog
        {
            PurchaseRequisitionId = purchaseRequisitionId,
            Action = action,
            PerformedByUserId = performedByUserId,
            PerformedVia = performedVia,
            Details = details,
            CreatedAt = DateTime.UtcNow
        });
    }


    // =========================================================
    // APPROVER CANDIDATES
    // =========================================================

    public async Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetApproverCandidatesAsync(int purchaseRequisitionId, int requestingUserId)
    {
        var record = await _context.PurchaseRequisitions
            .FirstOrDefaultAsync(x => x.Id == purchaseRequisitionId);

        if (record == null)
            throw new InvalidOperationException("Purchase requisition not found.");

        if (record.RequestedByUserId != requestingUserId)
            throw new UnauthorizedAccessException(
                "You can only view approver candidates for your own purchase requisitions.");

        // Scope candidates by the purchase requisition's own company - the
        // Entity chosen directly at Draft creation (see
        // CreateDraftAsync/ValidateAndComputeAsync) - rather than the
        // requester's personal CompanyId/Department. Those two can
        // disagree, and a requester with no personal company link at all
        // (e.g. a System Administrator account) previously made this
        // endpoint fail outright even though the PR itself has a
        // perfectly well-defined company.
        var companyId = record.CompanyId;

        var candidates = await _context.Users
            .Include(x => x.Department)
            .Where(u =>
                u.IsActive &&
                u.Id != requestingUserId &&
                (u.CompanyId == companyId ||
                 (u.DepartmentId != null && u.Department!.CompanyId == companyId)))
            .OrderBy(u => u.FullName)
            .ToListAsync();

        var userCandidates = candidates.Select(u => new PurchaseRequisitionApproverCandidateResponse
        {
            Id = u.Id,
            FullName = u.FullName,
            Email = u.Email,
            DepartmentName = u.Department?.DepartmentName,
            CandidateType = "User"
        });

        // External approvers (Gmail/Office 365, no login) - scoped the
        // same way as the requesting-user's own company above, plus
        // org-wide contacts (CompanyId == null).
        var contacts = await _context.PurchaseRequisitionContacts
            .Where(c =>
                c.IsActive &&
                (c.ContactType == "Approver" || c.ContactType == "Both") &&
                (c.CompanyId == companyId || c.CompanyId == null))
            .OrderBy(c => c.FullName)
            .ToListAsync();

        var contactCandidates = contacts.Select(c => new PurchaseRequisitionApproverCandidateResponse
        {
            Id = c.Id,
            FullName = c.FullName,
            Email = c.Email,
            DepartmentName = null,
            CandidateType = "Contact"
        });

        return userCandidates.Concat(contactCandidates);
    }

    /*
     * Contacts only (ContactType "Initiator" or "Both") - "Initiated by"
     * is purely informational metadata attributable to someone with no
     * login of their own (see PurchaseRequisition.InitiatedByContactId's
     * model comment); there is no equivalent "initiate on behalf of
     * another User" concept, so unlike GetApproverCandidatesAsync this
     * never includes system Users.
     */
    public async Task<IEnumerable<PurchaseRequisitionApproverCandidateResponse>>
        GetInitiatorCandidatesAsync(int? companyId)
    {
        var contacts = await _context.PurchaseRequisitionContacts
            .Where(c =>
                c.IsActive &&
                (c.ContactType == "Initiator" || c.ContactType == "Both") &&
                (c.CompanyId == companyId || c.CompanyId == null))
            .OrderBy(c => c.FullName)
            .ToListAsync();

        return contacts.Select(c => new PurchaseRequisitionApproverCandidateResponse
        {
            Id = c.Id,
            FullName = c.FullName,
            Email = c.Email,
            DepartmentName = null,
            CandidateType = "Contact"
        });
    }


    // =========================================================
    // APPROVAL ENGINE (Phase 4)
    // =========================================================

    public async Task<IEnumerable<PurchaseRequisitionPendingApprovalResponse>>
        GetPendingApprovalsAsync(int approverUserId)
    {
        var records = await _context.PurchaseRequisitions
            .Include(x => x.Company)
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
            CompanyName = r.Company?.Name ?? string.Empty,
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
     * isn't currently "live" - for the authenticated dashboard flow. Runs
     * this requisition's own ownership/status pre-checks, then hands off
     * to DecideStepCoreAsync (below) for the actual state transition,
     * which is shared with the secure email-link flow.
     */
    public async Task<PurchaseRequisitionResponse?> DecideStepAsync(
        int id,
        DecidePurchaseRequisitionStepRequest request,
        int decidingUserId,
        string pdfStorageRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.ApprovalSteps)
                .ThenInclude(s => s.AssignedApproverUser)
            .Include(x => x.ApprovalSteps)
                .ThenInclude(s => s.AssignedApproverContact)
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
                currentStep.AssignedApproverContactId.HasValue
                    ? "This stage is assigned to an external contact and can only be decided " +
                      "via the secure link sent to their email."
                    : "You are not the assigned approver for the current stage of this purchase requisition.");

        if (currentStep.Status != "Pending")
            throw new InvalidOperationException(
                "This approval stage has already been decided.");

        if (!request.Approve && string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException(
                "Remarks are required when rejecting a purchase requisition.");

        await DecideStepCoreAsync(
            record, currentStep, request.Approve, request.Remarks,
            decidingUserId, "WebApp", pdfStorageRootPath);

        return await GetByIdAsync(record.Id, decidingUserId, isPrivileged: false);
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
     *
     * Shared by both decision entry points - the authenticated dashboard
     * flow (DecideStepAsync) and the secure email-link flow
     * (DecideStepByTokenAsync) - so the state machine, in-app
     * notification, and outbound email only exist in one place. Callers
     * are responsible for their own pre-checks (ownership/authorization,
     * PR/step status, remarks-required-on-reject); this method assumes
     * the decision is already validated and just applies it.
     */
    private async Task DecideStepCoreAsync(
        Models.PurchaseRequisition record,
        PurchaseRequisitionApprovalStep currentStep,
        bool approve,
        string? remarks,
        int? decidingUserId,
        string performedVia,
        string pdfStorageRootPath)
    {
        var now = DateTime.UtcNow;
        currentStep.DecidedAt = now;
        currentStep.Remarks = remarks;

        // Null when the next/requesting party has no in-app account to
        // notify (e.g. the requester slot is always a User so this stays
        // non-null there, but a Contact-assigned next approval stage has
        // no User row - see the "advance to next stage" branch below).
        int? notifyUserId;
        string notifyType;
        string notifyTitle;
        string notifyMessage;

        var prLabel = record.PrNumber ?? $"#{record.Id}";

        // A Contact-decided step has no PerformedByUserId to trace the
        // decision back to (Contacts aren't Users) - fold their identity
        // into the audit log's Details text instead, so the trail stays
        // complete. A User-decided step is already fully traceable via
        // PerformedByUserId, so this is left out there to avoid noise.
        var deciderSuffix = currentStep.AssignedApproverContactId.HasValue
            ? $" (decided by {currentStep.AssignedApproverContact?.FullName ?? "external contact"} " +
              $"<{currentStep.AssignedApproverContact?.Email}>)"
            : string.Empty;

        PurchaseRequisitionApprovalStep? stepToEmailForApproval = null;
        var sendRequesterOutcomeEmail = false;
        var isFinalApproval = false;

        if (approve)
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
                    $"Stage {currentStep.StepOrder} approved - all stages complete.{deciderSuffix}",
                    performedVia);

                notifyUserId = record.RequestedByUserId;
                notifyType = "PurchaseRequisitionApproved";
                notifyTitle = "Purchase requisition approved";
                notifyMessage =
                    $"Your purchase requisition {prLabel} ({record.Title}) has been fully approved.";
                sendRequesterOutcomeEmail = true;
                isFinalApproval = true;
            }
            else
            {
                record.CurrentApprovalStepOrder = nextStep.StepOrder;
                record.UpdatedAt = now;

                AddAuditLog(record.Id, "StepApproved", decidingUserId,
                    $"Stage {currentStep.StepOrder} approved - advanced to stage {nextStep.StepOrder}.{deciderSuffix}",
                    performedVia);

                notifyUserId = nextStep.AssignedApproverUserId;
                notifyType = "PurchaseRequisitionApprovalNeeded";
                notifyTitle = "Purchase requisition needs your approval";
                notifyMessage =
                    $"{record.RequestedByUser?.FullName ?? "A user"} is waiting on your approval for {prLabel} ({record.Title}).";
                stepToEmailForApproval = nextStep;
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
                $"Stage {currentStep.StepOrder} rejected: {remarks}{deciderSuffix}",
                performedVia);

            notifyUserId = record.RequestedByUserId;
            notifyType = "PurchaseRequisitionRejected";
            notifyTitle = "Purchase requisition rejected";
            notifyMessage =
                $"Your purchase requisition {prLabel} ({record.Title}) was rejected at stage {currentStep.StepOrder}: {remarks}";
            sendRequesterOutcomeEmail = true;
        }

        await _context.SaveChangesAsync();

        // Contact-assigned steps/requesters have no User row to notify
        // in-app (Notification.UserId is a non-nullable FK) - the emailed
        // approval-request/outcome link below is their only notification.
        if (notifyUserId.HasValue)
        {
            AddNotification(notifyUserId.Value, notifyType, notifyTitle, notifyMessage, record.Id);
            await _context.SaveChangesAsync();
        }

        // Best-effort, same as the email helpers below - a PDF generation
        // failure must never undo a decision that's already been
        // committed to the database. GenerateAndStorePdfAsync catches and
        // logs its own failures.
        if (isFinalApproval)
        {
            await GenerateAndStorePdfAsync(record, pdfStorageRootPath);
        }

        // Email is best-effort and must never undo a decision that's
        // already been committed to the database - both helpers below
        // catch and log their own failures rather than throwing.
        if (stepToEmailForApproval != null)
        {
            await IssueTokenAndSendApprovalRequestEmailAsync(record, stepToEmailForApproval);
        }
        else if (sendRequesterOutcomeEmail)
        {
            await SendOutcomeEmailAsync(record, approve, remarks);
        }
    }


    // =========================================================
    // SECURE EMAIL APPROVAL LINKS (Phase 5)
    // =========================================================

    /*
     * Read-only lookup for the unauthenticated landing page - never
     * throws for an expired/consumed/inactive token and never mutates
     * anything, so a corporate email security scanner pre-fetching the
     * link via GET can't accidentally decide the step (see
     * PublicPurchaseRequisitionApprovalResponse's comment). Only returns
     * null when the token itself doesn't exist at all.
     */
    public async Task<PublicPurchaseRequisitionApprovalResponse?> GetPublicApprovalViewAsync(
        string rawToken)
    {
        var tokenEntity = await FindTokenAsync(rawToken);

        return tokenEntity == null ? null : MapPublicView(tokenEntity);
    }

    /*
     * Decides a step via a secure, single-use email link instead of an
     * authenticated session - the token itself (hashed, matched against
     * PurchaseRequisitionApprovalTokens) stands in for "who is allowed to
     * decide this step", since GetPublicApprovalViewAsync's caller was
     * never required to log in. Delegates to the same DecideStepCoreAsync
     * state machine as the dashboard flow so both paths stay in sync.
     */
    public async Task<PublicPurchaseRequisitionApprovalResponse?> DecideStepByTokenAsync(
        string rawToken,
        DecidePurchaseRequisitionStepRequest request,
        string pdfStorageRootPath)
    {
        var tokenEntity = await FindTokenAsync(rawToken);

        if (tokenEntity == null)
            return null;

        var step = tokenEntity.ApprovalStep;
        var record = step.PurchaseRequisition;

        if (tokenEntity.ConsumedAt != null)
            throw new InvalidOperationException(
                "This approval link has already been used.");

        if (tokenEntity.ExpiresAt < DateTime.UtcNow)
            throw new InvalidOperationException(
                "This approval link has expired. Please ask the requester for a new one, " +
                "or sign in and use the Pending Approvals page instead.");

        if (record.Status != "InApproval")
            throw new InvalidOperationException(
                "This purchase requisition is no longer awaiting approval.");

        if (step.StepOrder != record.CurrentApprovalStepOrder)
            throw new InvalidOperationException(
                "This approval stage is no longer active.");

        if (step.Status != "Pending")
            throw new InvalidOperationException(
                "This approval stage has already been decided.");

        if (!request.Approve && string.IsNullOrWhiteSpace(request.Remarks))
            throw new InvalidOperationException(
                "Remarks are required when rejecting a purchase requisition.");

        tokenEntity.ConsumedAt = DateTime.UtcNow;

        await DecideStepCoreAsync(
            record, step, request.Approve, request.Remarks,
            step.AssignedApproverUserId, "Email", pdfStorageRootPath);

        return MapPublicView(tokenEntity);
    }

    private async Task<PurchaseRequisitionApprovalToken?> FindTokenAsync(string rawToken)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
            return null;

        var tokenHash = HashToken(rawToken);

        return await _context.PurchaseRequisitionApprovalTokens
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.AssignedApproverUser)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.AssignedApproverContact)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.Company)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.RequestedByUser)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.LineItems)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.ApprovalSteps)
                        .ThenInclude(s => s.AssignedApproverUser)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.ApprovalSteps)
                        .ThenInclude(s => s.AssignedApproverContact)
            .FirstOrDefaultAsync(t => t.TokenHash == tokenHash);
    }

    private static PublicPurchaseRequisitionApprovalResponse MapPublicView(
        PurchaseRequisitionApprovalToken tokenEntity)
    {
        var step = tokenEntity.ApprovalStep;
        var record = step.PurchaseRequisition;

        return new PublicPurchaseRequisitionApprovalResponse
        {
            PrNumber = record.PrNumber,
            Title = record.Title,
            Justification = record.Justification,
            CompanyName = record.Company?.Name ?? string.Empty,
            RequestedByUserName = record.RequestedByUser?.FullName ?? string.Empty,

            Currency = record.Currency,
            SubtotalAmount = record.SubtotalAmount,
            CgstPercent = record.CgstPercent,
            SgstPercent = record.SgstPercent,
            TaxAmount = record.TaxAmount,
            TotalAmount = record.TotalAmount,

            StepOrder = step.StepOrder,
            RequiredApprovalStageCount = record.RequiredApprovalStageCount,
            ApproverName = step.AssignedApproverContactId.HasValue
                ? (step.AssignedApproverContact?.FullName ?? string.Empty)
                : (step.AssignedApproverUser?.FullName ?? string.Empty),

            PurchaseRequisitionStatus = record.Status,
            StepStatus = step.Status,
            IsDecided = tokenEntity.ConsumedAt != null || step.Status != "Pending",
            IsExpired = tokenEntity.ExpiresAt < DateTime.UtcNow,

            LineItems = record.LineItems
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
                .ToList()
        };
    }

    /*
     * Issues a fresh single-use token for the given (now-current) step
     * and emails its assigned approver a secure link. Called once when a
     * PR is first submitted (for stage 1) and again every time approval
     * advances to a new stage - never for a stage that isn't current, so
     * there's at most one live, unconsumed token per requisition at a
     * time even though a step could theoretically accumulate more than
     * one Tokens row across retries.
     */
    private async Task IssueTokenAndSendApprovalRequestEmailAsync(
        Models.PurchaseRequisition record,
        PurchaseRequisitionApprovalStep step)
    {
        // The approver is either a system User or a standalone Contact
        // (external, no login) - resolve whichever one is actually
        // assigned to this step. Both navigations are loaded by SubmitAsync
        // (freshly-constructed step) and FindTokenAsync (re-issued for a
        // later stage), so a null here really does mean "not loaded" or
        // "neither was ever assigned" (shouldn't happen given the DB CHECK
        // constraint), not just "this step happens to be Contact-assigned".
        string? approverName = step.AssignedApproverContactId.HasValue
            ? step.AssignedApproverContact?.FullName
            : step.AssignedApproverUser?.FullName;

        string? approverEmail = step.AssignedApproverContactId.HasValue
            ? step.AssignedApproverContact?.Email
            : step.AssignedApproverUser?.Email;

        if (string.IsNullOrWhiteSpace(approverEmail))
        {
            _logger.LogWarning(
                "Skipped issuing an approval email for purchase requisition {PurchaseRequisitionId} " +
                "stage {StepOrder} - the assigned approver was not loaded.",
                record.Id, step.StepOrder);
            return;
        }

        try
        {
            var rawToken = GenerateSecureToken();

            _context.PurchaseRequisitionApprovalTokens.Add(new PurchaseRequisitionApprovalToken
            {
                PurchaseRequisitionApprovalStepId = step.Id,
                TokenHash = HashToken(rawToken),
                ExpiresAt = DateTime.UtcNow.AddDays(ApprovalTokenValidityDays),
                CreatedAt = DateTime.UtcNow
            });

            await _context.SaveChangesAsync();

            var link = $"{_publicBaseUrl}/pr-approval/{rawToken}";
            var prLabel = record.PrNumber ?? $"#{record.Id}";
            var approverDisplayName = string.IsNullOrWhiteSpace(approverName)
                ? "there"
                : approverName;

            var subject = $"Approval needed: Purchase Requisition {prLabel}";
            var body =
                $"<p>Hi {System.Net.WebUtility.HtmlEncode(approverDisplayName)},</p>" +
                $"<p>{System.Net.WebUtility.HtmlEncode(record.RequestedByUser?.FullName ?? "A colleague")} " +
                $"has submitted purchase requisition <strong>{System.Net.WebUtility.HtmlEncode(prLabel)}</strong> " +
                $"(\"{System.Net.WebUtility.HtmlEncode(record.Title)}\") for " +
                $"{System.Net.WebUtility.HtmlEncode(record.Currency)} {record.TotalAmount:0.00}, and it is " +
                $"waiting on your decision (stage {step.StepOrder} of {record.RequiredApprovalStageCount}).</p>" +
                $"<p><a href=\"{link}\">Review and decide on this purchase requisition</a></p>" +
                $"<p>This link is valid for {ApprovalTokenValidityDays} days and can only be used once. " +
                "If it has expired, sign in to the app and check your Pending Approvals page instead.</p>";

            await _emailService.SendAsync(approverEmail, approverDisplayName, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to issue an approval token or send the approval-request email for " +
                "purchase requisition {PurchaseRequisitionId}, stage {StepOrder}.",
                record.Id, step.StepOrder);
        }
    }

    private async Task SendOutcomeEmailAsync(
        Models.PurchaseRequisition record,
        bool approved,
        string? remarks)
    {
        if (record.RequestedByUser == null)
            return;

        try
        {
            var prLabel = record.PrNumber ?? $"#{record.Id}";
            var requester = record.RequestedByUser;

            var subject = approved
                ? $"Approved: Purchase Requisition {prLabel}"
                : $"Rejected: Purchase Requisition {prLabel}";

            var outcomeSentence = approved
                ? "has been fully approved."
                : "was rejected" +
                  (string.IsNullOrWhiteSpace(remarks)
                      ? "."
                      : $": {System.Net.WebUtility.HtmlEncode(remarks)}");

            var body =
                $"<p>Hi {System.Net.WebUtility.HtmlEncode(requester.FullName)},</p>" +
                $"<p>Your purchase requisition <strong>{System.Net.WebUtility.HtmlEncode(prLabel)}</strong> " +
                $"(\"{System.Net.WebUtility.HtmlEncode(record.Title)}\") {outcomeSentence}</p>";

            await _emailService.SendAsync(requester.Email, requester.FullName, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send the decision-outcome email for purchase requisition {PurchaseRequisitionId}.",
                record.Id);
        }
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);

        // URL-safe base64 (RFC 4648 section 5), no padding - drops
        // straight into a path segment ("/pr-approval/{token}") with no
        // extra encoding step.
        return Convert.ToBase64String(bytes)
            .Replace('+', '-')
            .Replace('/', '_')
            .TrimEnd('=');
    }

    private static string HashToken(string rawToken)
    {
        var hash = SHA256.HashData(Encoding.UTF8.GetBytes(rawToken));

        return Convert.ToHexString(hash).ToLowerInvariant();
    }


    // =========================================================
    // PDF (Phase 6)
    // =========================================================

    /*
     * Renders and stores the approval PDF once a requisition reaches its
     * final Approved state (see DecideStepCoreAsync's isFinalApproval
     * branch). Stored under pdfStorageRootPath - the caller passes in
     * IWebHostEnvironment.ContentRootPath + "App_Data", NOT wwwroot -
     * so, unlike attachments, the file is never reachable as a bare
     * static URL; GetPdfFileAsync's authenticated access check is the
     * only way to read it back.
     *
     * Re-queries via Query() rather than trusting the caller's `record`
     * to already have every navigation loaded (LineItems/Attachments in
     * particular usually aren't, coming from DecideStepCoreAsync's
     * callers) - EF's identity map means this returns the SAME tracked
     * instance with the missing navigations now populated, not a
     * duplicate, so mutating PdfPath/PdfGeneratedAt on it is safe.
     */
    private async Task GenerateAndStorePdfAsync(
        Models.PurchaseRequisition record,
        string pdfStorageRootPath)
    {
        try
        {
            var full = await Query().FirstOrDefaultAsync(x => x.Id == record.Id);

            if (full == null)
                return;

            var directory = Path.Combine(
                pdfStorageRootPath, "purchase-requisitions", full.Id.ToString());

            Directory.CreateDirectory(directory);

            var safeFileNameBase = (full.PrNumber ?? full.Id.ToString())
                .Replace('/', '-')
                .Replace('\\', '-');

            var fileName = $"{safeFileNameBase}.pdf";
            var destination = Path.Combine(directory, fileName);

            new PurchaseRequisitionPdfDocument(full).GeneratePdf(destination);

            // Relative to pdfStorageRootPath, forward-slashed for
            // consistency regardless of the host OS - GetPdfFileAsync
            // re-joins it onto pdfStorageRootPath the same way attachments
            // re-join StoredPath onto webRootPath.
            full.PdfPath = $"purchase-requisitions/{full.Id}/{fileName}";
            full.PdfGeneratedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to generate the approval PDF for purchase requisition {PurchaseRequisitionId}.",
                record.Id);
        }
    }

    /*
     * "Approved but the Download PDF button never appeared" turned out to
     * always trace back to GenerateAndStorePdfAsync's one-shot attempt at
     * final approval silently failing (it's deliberately best-effort - a
     * PDF hiccup must never undo an already-committed approval decision)
     * and there being no retry. Rather than trying to guess/patch every
     * possible cause of that one-shot failure, this makes PDF generation
     * lazy and self-healing: any Approved PR that's missing its file (be
     * it PdfPath never having been set, or a stored file that's since
     * gone missing, e.g. a wiped volume) gets one generated here, at
     * download time, before serving it. Draft/Submitted/InApproval/
     * Rejected PRs never have a PDF - there's nothing to lazily generate
     * for those.
     */
    public async Task<(string PhysicalPath, string FileName)?> GetPdfFileAsync(
        int id,
        int requestingUserId,
        bool isPrivileged,
        string pdfStorageRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.ApprovalSteps)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (record == null)
            return null;

        var isOwner = record.RequestedByUserId == requestingUserId;
        var isAssignedApprover = record.ApprovalSteps
            .Any(s => s.AssignedApproverUserId == requestingUserId);

        if (!isOwner && !isPrivileged && !isAssignedApprover)
            throw new UnauthorizedAccessException(
                "You don't have access to this purchase requisition.");

        if (record.Status != "Approved")
            return null;

        string? physicalPath = string.IsNullOrWhiteSpace(record.PdfPath)
            ? null
            : Path.Combine(
                pdfStorageRootPath,
                record.PdfPath.Replace('/', Path.DirectorySeparatorChar));

        if (physicalPath == null || !File.Exists(physicalPath))
        {
            // GenerateAndStorePdfAsync re-queries by this same Id on the
            // same DbContext, so EF's identity map hands back this exact
            // `record` instance with the extra navigations populated -
            // mutating its PdfPath is what that call does, no re-fetch
            // needed here to observe the result.
            await GenerateAndStorePdfAsync(record, pdfStorageRootPath);

            if (string.IsNullOrWhiteSpace(record.PdfPath))
                return null; // generation itself failed - see backend logs

            physicalPath = Path.Combine(
                pdfStorageRootPath,
                record.PdfPath.Replace('/', Path.DirectorySeparatorChar));

            if (!File.Exists(physicalPath))
                return null;
        }

        return (physicalPath, Path.GetFileName(physicalPath));
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
