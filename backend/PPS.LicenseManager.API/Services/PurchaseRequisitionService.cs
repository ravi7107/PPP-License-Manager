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

    // How long the Finance "verify + upload PO" link stays usable. Longer
    // than an approval link's window - unlike an approver deciding a
    // single stage, Finance's PO turnaround usually depends on an
    // external system (e.g. Tally) and this link is deliberately
    // reusable (not single-use) so they can revisit it to fix a mistake.
    private const int FinanceTokenValidityDays = 30;

    // Email brand palette - lifted from the web app's own design tokens
    // (frontend/index.css --nova-* variables) so approval emails read as
    // the same product rather than a generic system notification.
    private const string EmailBrandColor = "#0F4FD1";      // --nova-blue-600
    private const string EmailApproveColor = "#0D9488";    // --nova-teal-500
    private const string EmailRejectColor = "#DC2626";     // --nova-red-500
    private const string EmailAmberColor = "#D97706";      // --nova-amber-500
    private const string EmailSlateStrong = "#0F172A";
    private const string EmailSlateText = "#334155";
    private const string EmailMutedText = "#64748B";
    private const string EmailFaintText = "#94A3B8";
    private const string EmailBorderColor = "#E2E8F0";
    private const string EmailPanelBg = "#F8FAFC";
    private const string EmailPageBg = "#F1F5F9";
    private const string EmailFontStack =
        "Arial, Helvetica, 'Segoe UI', sans-serif";

    private readonly ApplicationDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<PurchaseRequisitionService> _logger;
    private readonly string _publicBaseUrl;
    private readonly string _publicApiBaseUrl;

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

        // Base URL the BACKEND (not the frontend) is reachable at -
        // separate from _publicBaseUrl above because attachments live
        // under this API's own /uploads/ static path, not the frontend's
        // origin. Only used to build clickable quotation-attachment links
        // for the Finance landing page; configurable via
        // App:PublicApiBaseUrl / App__PublicApiBaseUrl the same way.
        _publicApiBaseUrl = (configuration["App:PublicApiBaseUrl"]
            ?? "http://localhost:8080").TrimEnd('/');
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
                .ThenInclude(x => x.AssignedApproverContact)
            .Include(x => x.PreviousRevision)
            .Include(x => x.PoUploadedByUser);
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

            PoNumber = r.PoNumber,
            PoDocumentPath = r.PoDocumentPath,
            PoUploadedAt = r.PoUploadedAt,
            PoUploadedByUserName = r.PoUploadedByUser?.FullName,

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
                .Select(s =>
                {
                    var approver = PurchaseRequisitionApproverDisplay.Resolve(s);

                    return new PurchaseRequisitionApprovalStepResponse
                    {
                        Id = s.Id,
                        StepOrder = s.StepOrder,
                        AssignedApproverUserId = s.AssignedApproverUserId,
                        AssignedApproverContactId = s.AssignedApproverContactId,
                        ApproverType = approver.ApproverType,
                        AssignedApproverUserName = approver.Name,
                        AssignedApproverEmail = approver.Email,
                        Status = s.Status,
                        DecidedAt = s.DecidedAt,
                        Remarks = s.Remarks
                    };
                })
                .ToList(),

            RevisionNumber = r.RevisionNumber,
            PreviousRevisionId = r.PreviousRevisionId,
            PreviousPrNumber = r.PreviousRevision?.PrNumber
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
            .Include(x => x.Vendor)
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
        await IssueTokenAndSendApprovalRequestEmailAsync(record, firstStep, createdSteps);

        return await GetByIdAsync(record.Id, requestedByUserId, isPrivileged: false);
    }


    // =========================================================
    // REVISIONS
    // =========================================================

    /*
     * Clones an Approved purchase requisition into a brand-new Draft that
     * links back to it (PreviousRevisionId), rather than ever mutating
     * the approved row - the immutability trigger would block that
     * anyway (see PurchaseRequisition.cs's class comment), and "never
     * overwrite the previous approved version" is the whole point of a
     * revision. The new Draft then goes through the exact same, entirely
     * unmodified Draft -> Submit -> Approve pipeline as any other PR -
     * there is no separate revision approval flow, no new state machine.
     * Line items are recomputed via ValidateAndComputeAsync (the same
     * helper CreateDraftAsync/UpdateDraftAsync use), never copied
     * directly, so a revision's LineTotal/SubtotalAmount/TaxAmount/
     * TotalAmount hold the exact same server-computed-only invariant as
     * any freshly-created draft.
     */
    public async Task<PurchaseRequisitionResponse> CreateRevisionAsync(
        int approvedPrId,
        int requestedByUserId)
    {
        var original = await _context.PurchaseRequisitions
            .Include(x => x.Company)
            .Include(x => x.Vendor)
            .Include(x => x.LineItems)
            .FirstOrDefaultAsync(x => x.Id == approvedPrId);

        if (original == null)
            throw new InvalidOperationException(
                "Purchase requisition not found.");

        // Owner-only, same rule as Submit/Update/Delete on a Draft - the
        // Status == "Approved" check below is the real business gate;
        // this just decides who's allowed to ask for a revision at all.
        if (original.RequestedByUserId != requestedByUserId)
            throw new UnauthorizedAccessException(
                "You can only create a revision of your own purchase requisitions.");

        if (original.Status != "Approved")
            throw new InvalidOperationException(
                "Only an approved purchase requisition can be revised.");

        var requestedBy = await _context.Users
            .FirstOrDefaultAsync(x => x.Id == requestedByUserId);

        if (requestedBy == null || !requestedBy.IsActive)
            throw new InvalidOperationException(
                "Requesting user not found or inactive.");

        var saveRequest = new SavePurchaseRequisitionRequest
        {
            CompanyId = original.CompanyId,
            VendorId = original.VendorId,
            Title = original.Title,
            Justification = original.Justification,
            Currency = original.Currency,
            CgstPercent = original.CgstPercent,
            SgstPercent = original.SgstPercent,
            InitiatedByContactId = original.InitiatedByContactId,
            LineItems = original.LineItems
                .OrderBy(li => li.LineNumber)
                .Select(li => new PurchaseRequisitionLineItemRequest
                {
                    ItemDescription = li.ItemDescription,
                    Category = li.Category,
                    Quantity = li.Quantity,
                    UnitOfMeasure = li.UnitOfMeasure,
                    UnitPrice = li.UnitPrice,
                    Notes = li.Notes
                })
                .ToList()
        };

        var lineItems = new List<PurchaseRequisitionLineItem>();

        // Re-validates Company/Vendor are still active the same way a
        // manual save would - if either has since been deactivated, this
        // fails loudly here instead of silently cloning a now-invalid
        // reference into the new revision.
        var (company, vendor, subtotal, cgstPercent, sgstPercent, tax, total) =
            await ValidateAndComputeAsync(saveRequest, lineItems);

        var initiatedByContactId =
            await ValidateInitiatorContactAsync(saveRequest.InitiatedByContactId);

        var revision = new Models.PurchaseRequisition
        {
            CompanyId = company.Id,
            VendorId = vendor?.Id,
            RequestedByUserId = requestedByUserId,
            InitiatedByContactId = initiatedByContactId,
            Title = original.Title,
            Justification = original.Justification,
            Status = "Draft",
            Currency = original.Currency,
            SubtotalAmount = subtotal,
            CgstPercent = cgstPercent,
            SgstPercent = sgstPercent,
            TaxAmount = tax,
            TotalAmount = total,
            RevisionNumber = original.RevisionNumber + 1,
            PreviousRevisionId = original.Id,
            CreatedAt = DateTime.UtcNow,
            LineItems = lineItems
        };

        _context.PurchaseRequisitions.Add(revision);

        await _context.SaveChangesAsync();

        var originalLabel = original.PrNumber ?? $"#{original.Id}";

        AddAuditLog(revision.Id, "RevisionCreated", requestedByUserId,
            $"Revision {revision.RevisionNumber:D2} of {originalLabel}.");
        AddAuditLog(original.Id, "RevisionCreated", requestedByUserId,
            $"Revision {revision.RevisionNumber:D2} created as Draft #{revision.Id}.");

        await _context.SaveChangesAsync();

        return await GetByIdAsync(revision.Id, requestedByUserId, isPrivileged: false)
            ?? throw new InvalidOperationException(
                "Unable to load the newly created revision.");
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
            .Include(x => x.Company)
            .Include(x => x.Vendor)
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
            var allSteps = record.ApprovalSteps
                .OrderBy(s => s.StepOrder)
                .ToList();

            await IssueTokenAndSendApprovalRequestEmailAsync(
                record, stepToEmailForApproval, allSteps);
        }
        else if (sendRequesterOutcomeEmail)
        {
            await SendOutcomeEmailAsync(record, approve, remarks);
        }

        // Also best-effort (see IssueFinanceTokenAndSendNotificationAsync's
        // own comment) - runs after GenerateAndStorePdfAsync so `record`
        // has PdfPath set and every navigation this needs (Vendor,
        // Attachments, RequestedByUser) already loaded via the identity
        // map. Only fires on the final approval, never on a mid-chain
        // step approval or a rejection.
        if (isFinalApproval)
        {
            await IssueFinanceTokenAndSendNotificationAsync(
                record, decidingUserId, pdfStorageRootPath);
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
                    .ThenInclude(r => r.Vendor)
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
        PurchaseRequisitionApprovalStep step,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps)
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

            var subject =
                $"Action required: Approve {prLabel} — {record.Title} " +
                $"({record.Currency} {record.TotalAmount:N2})";

            var body = BuildApprovalRequestEmailHtml(
                record, step, allSteps, approverDisplayName, link);

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

    /*
     * Renders the "Approval Progress" stepper shared by the
     * approval-request email and the final-outcome email - a vertical
     * list of every stage (in order) with a colored status marker, so an
     * approver or executive can see the whole chain at a glance without
     * signing in. highlightStepId marks the one step this particular
     * email is actually about (null for the outcome email, where nothing
     * is still "awaiting decision").
     *
     * Deliberately built with nested tables and inline styles only (no
     * <style> block, no flexbox/grid) - this is the only layout approach
     * that renders consistently across Outlook's Word rendering engine,
     * Gmail, and mobile mail clients.
     */
    private static string BuildApprovalStepperHtml(
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        int? highlightStepId)
    {
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;

        var ordered = allSteps.OrderBy(s => s.StepOrder).ToList();

        var sb = new StringBuilder();

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">");

        for (var i = 0; i < ordered.Count; i++)
        {
            var s = ordered[i];
            var isLast = i == ordered.Count - 1;

            string circleColor;
            var circleTextColor = "#ffffff";
            string circleContent;
            string statusLabel;
            string statusColor;
            var circleBorder = "";

            if (s.Status == "Approved")
            {
                circleColor = EmailApproveColor;
                circleContent = "&#10003;";
                statusLabel = "Approved";
                statusColor = EmailApproveColor;
            }
            else if (s.Status == "Rejected")
            {
                circleColor = EmailRejectColor;
                circleContent = "&#10005;";
                statusLabel = "Rejected";
                statusColor = EmailRejectColor;
            }
            else if (s.Status == "Skipped")
            {
                circleColor = "#CBD5E1";
                circleContent = "&#8211;";
                statusLabel = "Skipped";
                statusColor = EmailFaintText;
                circleTextColor = "#475569";
            }
            else if (s.Id == highlightStepId)
            {
                circleColor = EmailAmberColor;
                circleContent = s.StepOrder.ToString();
                statusLabel = "Awaiting decision";
                statusColor = EmailAmberColor;
            }
            else
            {
                circleColor = "#ffffff";
                circleContent = s.StepOrder.ToString();
                statusLabel = "Not started yet";
                statusColor = EmailFaintText;
                circleTextColor = EmailMutedText;
                circleBorder = "border:2px solid #CBD5E1;";
            }

            var approverName = s.AssignedApproverContactId.HasValue
                ? (s.AssignedApproverContact?.FullName ?? "External contact")
                : (s.AssignedApproverUser?.FullName ?? "Unassigned");

            var externalTag = s.AssignedApproverContactId.HasValue
                ? " <span style=\"color:" + EmailFaintText + ";font-weight:400;\">(external)</span>"
                : "";

            var bottomPadding = isLast ? "0" : "18px";

            sb.Append("<tr>");
            sb.Append("<td style=\"width:32px;vertical-align:top;padding:0 0 " + bottomPadding + " 0;\">");
            sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td style=\"width:24px;height:24px;border-radius:12px;background-color:" + circleColor + ";" + circleBorder + "text-align:center;\">");
            sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:12px;font-weight:700;color:" + circleTextColor + ";line-height:24px;\">" + circleContent + "</span>");
            sb.Append("</td></tr></table>");
            sb.Append("</td>");
            sb.Append("<td style=\"padding:0 0 " + bottomPadding + " 12px;vertical-align:top;\">");
            sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:13px;font-weight:600;color:" + EmailSlateStrong + ";\">Stage " + s.StepOrder + ": " + Enc(approverName) + externalTag + "</div>");
            sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:12px;color:" + statusColor + ";margin-top:2px;font-weight:600;\">" + statusLabel + "</div>");
            sb.Append("</td>");
            sb.Append("</tr>");
        }

        sb.Append("</table>");

        return sb.ToString();
    }

    /*
     * Full HTML for the approval-request email - branded to match the
     * web app's own palette (frontend/index.css --nova-* tokens), with
     * two prominent Approve/Reject buttons and the approval stepper at
     * the bottom. The buttons link to the same secure landing page as a
     * plain "review" link would, just with ?action=approve/reject so the
     * landing page can pre-highlight the matching choice - the decision
     * itself still requires one confirming click ON that page, never
     * merely opening the email link, since corporate security scanners
     * routinely pre-fetch links via GET before a human ever sees them
     * (see PublicPurchaseRequisitionApprovalResponse's comment).
     */
    private static string BuildApprovalRequestEmailHtml(
        Models.PurchaseRequisition record,
        PurchaseRequisitionApprovalStep step,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        string approverDisplayName,
        string reviewLink)
    {
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;

        var prLabel = record.PrNumber ?? $"#{record.Id}";
        var requesterName = record.RequestedByUser?.FullName ?? "A colleague";
        var companyName = record.Company?.Name;
        var vendorName = record.Vendor?.VendorName;
        var approveLink = reviewLink + "?action=approve";
        var rejectLink = reviewLink + "?action=reject";

        var preheader =
            prLabel + ": " + record.Title + " — " + record.Currency + " " +
            record.TotalAmount.ToString("N2") + " is waiting on your approval " +
            "(stage " + step.StepOrder + " of " + record.RequiredApprovalStageCount + ").";

        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html>");
        sb.Append("<html><head><meta charset=\"utf-8\" />");
        sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.Append("<title></title></head>");
        sb.Append("<body style=\"margin:0;padding:0;background-color:" + EmailPageBg + ";\">");

        sb.Append("<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;\">");
        sb.Append(Enc(preheader));
        sb.Append("&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailPageBg + ";padding:32px 16px;\">");
        sb.Append("<tr><td align=\"center\">");
        sb.Append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:100%;background-color:#ffffff;border-radius:12px;\">");

        sb.Append("<tr><td style=\"background-color:" + EmailBrandColor + ";padding:24px 32px;border-radius:12px 12px 0 0;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"width:44px;height:44px;background-color:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;\">");
        sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:15px;font-weight:700;color:" + EmailBrandColor + ";line-height:44px;\">PPS</span>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding-left:14px;vertical-align:middle;\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:17px;font-weight:700;color:#ffffff;\">PPS SmartAsset</div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:rgba(255,255,255,0.78);letter-spacing:0.05em;margin-top:2px;\">PURCHASE REQUISITION APPROVAL</div>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:32px;font-family:" + EmailFontStack + ";\">");

        sb.Append("<div style=\"font-size:11px;font-weight:700;letter-spacing:0.06em;color:" + EmailBrandColor + ";text-transform:uppercase;margin-bottom:6px;\">");
        sb.Append("Approval Requested &middot; Stage " + step.StepOrder + " of " + record.RequiredApprovalStageCount);
        sb.Append("</div>");

        sb.Append("<h1 style=\"margin:0 0 16px;font-size:21px;line-height:1.35;color:" + EmailSlateStrong + ";font-family:" + EmailFontStack + ";\">");
        sb.Append(Enc(prLabel) + " &mdash; " + Enc(record.Title));
        sb.Append("</h1>");

        sb.Append("<p style=\"margin:0 0 22px;font-size:14px;line-height:1.6;color:" + EmailSlateText + ";\">");
        sb.Append("Hi " + Enc(approverDisplayName) + ", <strong>" + Enc(requesterName) + "</strong> has submitted this purchase requisition and it's waiting on your decision.");
        sb.Append("</p>");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:22px;background-color:" + EmailPanelBg + ";border:1px solid " + EmailBorderColor + ";border-radius:8px;\">");

        sb.Append("<tr>");
        sb.Append("<td style=\"padding:14px 18px;width:50%;border-bottom:1px solid " + EmailBorderColor + ";\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Requested By</div>");
        sb.Append("<div style=\"font-size:13px;color:" + EmailSlateStrong + ";font-weight:600;margin-top:3px;\">" + Enc(requesterName) + "</div>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding:14px 18px;width:50%;border-bottom:1px solid " + EmailBorderColor + ";\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Entity</div>");
        sb.Append("<div style=\"font-size:13px;color:" + EmailSlateStrong + ";font-weight:600;margin-top:3px;\">" + (string.IsNullOrWhiteSpace(companyName) ? "—" : Enc(companyName)) + "</div>");
        sb.Append("</td>");
        sb.Append("</tr>");

        sb.Append("<tr>");
        sb.Append("<td style=\"padding:14px 18px;\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Amount</div>");
        sb.Append("<div style=\"font-size:15px;color:" + EmailSlateStrong + ";font-weight:700;margin-top:3px;\">" + Enc(record.Currency) + " " + record.TotalAmount.ToString("N2") + "</div>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding:14px 18px;\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Vendor</div>");
        sb.Append("<div style=\"font-size:13px;color:" + EmailSlateStrong + ";font-weight:600;margin-top:3px;\">" + (string.IsNullOrWhiteSpace(vendorName) ? "Not yet selected" : Enc(vendorName)) + "</div>");
        sb.Append("</td>");
        sb.Append("</tr>");

        sb.Append("</table>");

        if (!string.IsNullOrWhiteSpace(record.Justification))
        {
            sb.Append("<div style=\"margin:0 0 22px;padding:12px 16px;background-color:" + EmailPanelBg + ";border-left:3px solid " + EmailBrandColor + ";border-radius:0 6px 6px 0;\">");
            sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;margin-bottom:4px;\">Justification</div>");
            sb.Append("<div style=\"font-size:13px;color:" + EmailSlateText + ";line-height:1.5;\">" + Enc(record.Justification) + "</div>");
            sb.Append("</div>");
        }

        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:4px 0 10px;\"><tr>");
        sb.Append("<td style=\"border-radius:8px;background-color:" + EmailApproveColor + ";\">");
        sb.Append("<a href=\"" + approveLink + "\" style=\"display:inline-block;padding:13px 32px;font-family:" + EmailFontStack + ";font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;\">&#10003; Approve</a>");
        sb.Append("</td>");
        sb.Append("<td style=\"width:12px;\">&nbsp;</td>");
        sb.Append("<td style=\"border-radius:8px;background-color:#ffffff;border:2px solid " + EmailRejectColor + ";\">");
        sb.Append("<a href=\"" + rejectLink + "\" style=\"display:inline-block;padding:11px 30px;font-family:" + EmailFontStack + ";font-size:14px;font-weight:700;color:" + EmailRejectColor + ";text-decoration:none;border-radius:8px;\">&#10005; Reject</a>");
        sb.Append("</td>");
        sb.Append("</tr></table>");

        sb.Append("<p style=\"margin:10px 0 26px;font-size:11.5px;line-height:1.6;color:" + EmailFaintText + ";\">");
        sb.Append("Either button opens a secure confirmation page - for your security, the decision is only recorded once you confirm it there, not directly from this email. Link not working? Paste this into your browser: ");
        sb.Append("<a href=\"" + reviewLink + "\" style=\"color:" + EmailBrandColor + ";\">" + reviewLink + "</a>");
        sb.Append("</p>");

        sb.Append("<div style=\"border-top:1px solid " + EmailBorderColor + ";margin:0 0 24px;\"></div>");

        sb.Append("<div style=\"font-size:11px;font-weight:700;letter-spacing:0.05em;color:" + EmailSlateText + ";text-transform:uppercase;margin-bottom:16px;\">Approval Progress</div>");
        sb.Append(BuildApprovalStepperHtml(allSteps, step.Id));

        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:20px 32px;background-color:" + EmailPanelBg + ";border-top:1px solid " + EmailBorderColor + ";border-radius:0 0 12px 12px;\">");
        sb.Append("<p style=\"margin:0;font-size:11px;color:" + EmailFaintText + ";line-height:1.6;font-family:" + EmailFontStack + ";\">");
        sb.Append("This link is valid for " + ApprovalTokenValidityDays + " days and can only be used once. If it has expired, sign in to the app and check your Pending Approvals page instead. Please don't forward this email - it grants approval access to this request.");
        sb.Append("</p>");
        sb.Append("</td></tr>");

        sb.Append("</table>");
        sb.Append("</td></tr></table>");
        sb.Append("</body></html>");

        return sb.ToString();
    }

    /*
     * Full HTML for the final-outcome email (sent to the requester once
     * the requisition is fully approved or rejected at any stage) - same
     * branded shell as the approval-request email, colored by outcome,
     * with the same stepper at the bottom (highlightStepId null, since
     * nothing is "awaiting decision" once there's a final outcome) so the
     * requester can see the full trail without signing in.
     */
    private static string BuildOutcomeEmailHtml(
        Models.PurchaseRequisition record,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        bool approved,
        string? remarks)
    {
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;

        var prLabel = record.PrNumber ?? $"#{record.Id}";
        var requesterName = record.RequestedByUser?.FullName ?? "there";
        var accentColor = approved ? EmailApproveColor : EmailRejectColor;
        var statusWord = approved ? "APPROVED" : "REJECTED";

        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html>");
        sb.Append("<html><head><meta charset=\"utf-8\" />");
        sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.Append("<title></title></head>");
        sb.Append("<body style=\"margin:0;padding:0;background-color:" + EmailPageBg + ";\">");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailPageBg + ";padding:32px 16px;\">");
        sb.Append("<tr><td align=\"center\">");
        sb.Append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:100%;background-color:#ffffff;border-radius:12px;\">");

        sb.Append("<tr><td style=\"background-color:" + accentColor + ";padding:24px 32px;border-radius:12px 12px 0 0;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"width:44px;height:44px;background-color:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;\">");
        sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:15px;font-weight:700;color:" + accentColor + ";line-height:44px;\">PPS</span>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding-left:14px;vertical-align:middle;\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:17px;font-weight:700;color:#ffffff;\">PPS SmartAsset</div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:rgba(255,255,255,0.78);letter-spacing:0.05em;margin-top:2px;\">PURCHASE REQUISITION " + statusWord + "</div>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:32px;font-family:" + EmailFontStack + ";\">");

        sb.Append("<h1 style=\"margin:0 0 16px;font-size:21px;line-height:1.35;color:" + EmailSlateStrong + ";font-family:" + EmailFontStack + ";\">");
        sb.Append(Enc(prLabel) + " &mdash; " + Enc(record.Title));
        sb.Append("</h1>");

        var outcomeSentence = approved
            ? "has been <strong style=\"color:" + EmailApproveColor + ";\">fully approved</strong>."
            : "was <strong style=\"color:" + EmailRejectColor + ";\">rejected</strong>" +
              (string.IsNullOrWhiteSpace(remarks) ? "." : ": " + Enc(remarks));

        sb.Append("<p style=\"margin:0 0 22px;font-size:14px;line-height:1.6;color:" + EmailSlateText + ";\">");
        sb.Append("Hi " + Enc(requesterName) + ", your purchase requisition <strong>" + Enc(prLabel) + "</strong> (\"" + Enc(record.Title) + "\") " + outcomeSentence);
        sb.Append("</p>");

        if (allSteps.Count > 0)
        {
            sb.Append("<div style=\"border-top:1px solid " + EmailBorderColor + ";margin:8px 0 24px;\"></div>");
            sb.Append("<div style=\"font-size:11px;font-weight:700;letter-spacing:0.05em;color:" + EmailSlateText + ";text-transform:uppercase;margin-bottom:16px;\">Approval Trail</div>");
            sb.Append(BuildApprovalStepperHtml(allSteps, null));
        }

        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:20px 32px;background-color:" + EmailPanelBg + ";border-top:1px solid " + EmailBorderColor + ";border-radius:0 0 12px 12px;\">");
        sb.Append("<p style=\"margin:0;font-size:11px;color:" + EmailFaintText + ";line-height:1.6;font-family:" + EmailFontStack + ";\">");
        sb.Append("Sign in to PPS SmartAsset to view the full details" + (approved ? " or download the PDF copy." : "."));
        sb.Append("</p>");
        sb.Append("</td></tr>");

        sb.Append("</table>");
        sb.Append("</td></tr></table>");
        sb.Append("</body></html>");

        return sb.ToString();
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

            var allSteps = record.ApprovalSteps
                .OrderBy(s => s.StepOrder)
                .ToList();

            var body = BuildOutcomeEmailHtml(record, allSteps, approved, remarks);

            await _emailService.SendAsync(requester.Email, requester.FullName, subject, body);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send the decision-outcome email for purchase requisition {PurchaseRequisitionId}.",
                record.Id);
        }
    }

    /*
     * Fires automatically the moment a PR reaches its final Approved
     * state (called from DecideStepCoreAsync's isFinalApproval branch,
     * after GenerateAndStorePdfAsync - see that method's comment on why
     * `record`'s navigations are already fully loaded by the time this
     * runs). Skips silently (with a log line, per
     * PurchaseRequisitionSettings.FinanceNotificationEmail's own comment)
     * if no Finance address has been configured yet - a missing setting
     * must never block an approval from completing.
     *
     * Attaches the PR PDF's actual bytes to the email (Finance has no
     * in-app login, so the authenticated GetPdfFileAsync endpoint isn't
     * reachable to them - the email is the only channel). Vendor
     * quotation attachments are linked instead of attached - they
     * already live under the API's public /uploads/ path like every
     * other attachment in this module (see UploadAttachmentAsync), so a
     * link is enough and avoids inflating the email with duplicate
     * bytes the PDF's own Vendor Information section already summarizes.
     */
    private async Task IssueFinanceTokenAndSendNotificationAsync(
        Models.PurchaseRequisition record,
        int? decidingUserId,
        string pdfStorageRootPath)
    {
        var settings = await _context.PurchaseRequisitionSettings.FirstOrDefaultAsync();
        var financeEmail = settings?.FinanceNotificationEmail?.Trim();

        if (string.IsNullOrWhiteSpace(financeEmail))
        {
            _logger.LogInformation(
                "Skipped notifying Finance for purchase requisition {PurchaseRequisitionId} - " +
                "no Finance Notification Email is configured yet (Purchase Requisition Settings).",
                record.Id);
            return;
        }

        var notification = new PurchaseRequisitionFinanceNotification
        {
            PurchaseRequisitionId = record.Id,
            SentToEmail = financeEmail,
            // Whoever's decision caused this final approval - falls back
            // to the requester on the rare path where the final step was
            // decided by an external Contact (no User row to attribute
            // it to). See this model's own comment for why this column's
            // meaning shifted once the trigger became automatic.
            SentByUserId = decidingUserId ?? record.RequestedByUserId,
            SentAt = DateTime.UtcNow,
            DeliveryStatus = "Sent"
        };

        try
        {
            var rawToken = GenerateSecureToken();
            notification.TokenHash = HashToken(rawToken);
            notification.ExpiresAt = DateTime.UtcNow.AddDays(FinanceTokenValidityDays);

            _context.PurchaseRequisitionFinanceNotifications.Add(notification);
            await _context.SaveChangesAsync();

            var link = $"{_publicBaseUrl}/pr-finance/{rawToken}";
            var prLabel = record.PrNumber ?? $"#{record.Id}";

            var attachments = new List<EmailAttachment>();

            if (!string.IsNullOrWhiteSpace(record.PdfPath))
            {
                var pdfPhysicalPath = Path.Combine(
                    pdfStorageRootPath, record.PdfPath.Replace('/', Path.DirectorySeparatorChar));

                if (File.Exists(pdfPhysicalPath))
                {
                    attachments.Add(new EmailAttachment
                    {
                        FileName = Path.GetFileName(pdfPhysicalPath),
                        ContentType = "application/pdf",
                        Content = await File.ReadAllBytesAsync(pdfPhysicalPath)
                    });
                }
            }

            var quotationAttachments = record.Attachments
                .Where(a => a.AttachmentType == "VendorQuotation")
                .OrderBy(a => a.UploadedAt)
                .ToList();

            var subject =
                $"Purchase Requisition Approved — {prLabel}: verify and issue PO " +
                $"({record.Currency} {record.TotalAmount:N2})";

            var body = BuildFinanceNotificationEmailHtml(record, quotationAttachments, link);

            await _emailService.SendWithAttachmentsAsync(
                financeEmail, "Finance", subject, body, attachments);

            AddAuditLog(record.Id, "SharedWithFinance", decidingUserId,
                $"Finance notification emailed to {financeEmail}.", "WebApp");
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            notification.DeliveryStatus = "Failed";
            notification.ErrorMessage = ex.Message.Length > 1000
                ? ex.Message[..1000]
                : ex.Message;

            try
            {
                await _context.SaveChangesAsync();
            }
            catch
            {
                // Best-effort logging of the failure itself failed too -
                // nothing more to do here, the error is already logged
                // below.
            }

            _logger.LogError(ex,
                "Failed to issue a Finance action token or send the Finance " +
                "notification email for purchase requisition {PurchaseRequisitionId}.",
                record.Id);
        }
    }

    /*
     * Looked up by GetPublicFinanceViewAsync/UploadPoByTokenAsync -
     * mirrors FindTokenAsync's shape for the approval-link flow, hashing
     * the incoming raw token and matching it against the stored hash.
     * Unlike FindTokenAsync this never checks ConsumedAt (there isn't
     * one - see PurchaseRequisitionFinanceNotification.TokenHash's
     * comment on why this link is deliberately reusable).
     */
    private async Task<PurchaseRequisitionFinanceNotification?> FindFinanceTokenAsync(string rawToken)
    {
        if (string.IsNullOrWhiteSpace(rawToken))
            return null;

        var tokenHash = HashToken(rawToken);

        return await _context.PurchaseRequisitionFinanceNotifications
            .Include(n => n.PurchaseRequisition)
                .ThenInclude(r => r.Company)
            .Include(n => n.PurchaseRequisition)
                .ThenInclude(r => r.Vendor)
            .Include(n => n.PurchaseRequisition)
                .ThenInclude(r => r.RequestedByUser)
            .Include(n => n.PurchaseRequisition)
                .ThenInclude(r => r.LineItems)
            .Include(n => n.PurchaseRequisition)
                .ThenInclude(r => r.Attachments)
            .Where(n => n.TokenHash == tokenHash)
            // A PR could in principle be re-approved via a revision,
            // issuing a second Finance token - always act on the most
            // recently issued one for a given hash (hashes shouldn't
            // collide across rows in practice, but this keeps the lookup
            // well-defined regardless).
            .OrderByDescending(n => n.SentAt)
            .FirstOrDefaultAsync();
    }

    private static PublicPurchaseRequisitionFinanceResponse MapPublicFinanceView(
        PurchaseRequisitionFinanceNotification notification,
        string publicApiBaseUrl)
    {
        var record = notification.PurchaseRequisition;

        return new PublicPurchaseRequisitionFinanceResponse
        {
            PrNumber = record.PrNumber,
            Title = record.Title,
            CompanyName = record.Company?.Name ?? string.Empty,
            RequestedByUserName = record.RequestedByUser?.FullName ?? string.Empty,

            VendorName = record.Vendor?.VendorName,
            VendorGstin = record.Vendor?.GSTIN,

            Currency = record.Currency,
            SubtotalAmount = record.SubtotalAmount,
            TaxAmount = record.TaxAmount,
            TotalAmount = record.TotalAmount,

            PurchaseRequisitionStatus = record.Status,
            IsExpired = notification.ExpiresAt.HasValue && notification.ExpiresAt.Value < DateTime.UtcNow,

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
                .ToList(),

            QuotationAttachments = record.Attachments
                .Where(a => a.AttachmentType == "VendorQuotation")
                .OrderBy(a => a.UploadedAt)
                .Select(a => new PublicPurchaseRequisitionQuotationResponse
                {
                    FileName = a.FileName,
                    DownloadUrl = $"{publicApiBaseUrl}{a.StoredPath}"
                })
                .ToList(),

            PoNumber = record.PoNumber,
            HasPoDocument = !string.IsNullOrWhiteSpace(record.PoDocumentPath),
            PoUploadedAt = record.PoUploadedAt
        };
    }

    /*
     * Read-only lookup for the unauthenticated Finance landing page -
     * never throws for an expired token, mirrors
     * GetPublicApprovalViewAsync's GET-is-always-safe contract. Only
     * returns null when the token itself doesn't exist at all.
     */
    public async Task<PublicPurchaseRequisitionFinanceResponse?> GetPublicFinanceViewAsync(
        string rawToken)
    {
        var notification = await FindFinanceTokenAsync(rawToken);

        return notification == null ? null : MapPublicFinanceView(notification, _publicApiBaseUrl);
    }

    /*
     * Records Finance's PO upload via the secure, reusable link - no
     * authenticated session backs this call, same token-as-credential
     * principle as DecideStepByTokenAsync. Unlike that flow this is
     * deliberately re-callable: a second upload simply overwrites
     * PoNumber/PoDocumentPath/PoUploadedAt and re-sends the "PO ready"
     * email to the requester with the latest file, rather than being
     * rejected as already-consumed (see TokenHash's comment).
     *
     * PoUploadedByUserId is left null - Finance isn't a User in this
     * app (same reasoning as PurchaseRequisitionFinanceNotification's
     * email-only addressing) - the audit log entry captures which
     * Finance address performed the upload instead.
     */
    public async Task<PublicPurchaseRequisitionFinanceResponse?> UploadPoByTokenAsync(
        string rawToken,
        IFormFile file,
        string? poNumber,
        string pdfStorageRootPath)
    {
        var notification = await FindFinanceTokenAsync(rawToken);

        if (notification == null)
            return null;

        if (notification.ExpiresAt.HasValue && notification.ExpiresAt.Value < DateTime.UtcNow)
            throw new InvalidOperationException(
                "This Finance link has expired. Please ask the requester to have a new approval " +
                "notification sent, or contact them directly for the purchase requisition details.");

        var record = notification.PurchaseRequisition;

        if (record.Status != "Approved")
            throw new InvalidOperationException(
                "This purchase requisition is not (or no longer) in an Approved state.");

        if (file == null || file.Length == 0)
            throw new InvalidOperationException("Please select a PO file to upload.");

        if (file.Length > MaxAttachmentSizeBytes)
            throw new InvalidOperationException("The PO file must not exceed 15 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!AllowedAttachmentExtensions.Contains(extension))
            throw new InvalidOperationException(
                "Only PDF, JPG, PNG, DOCX, and XLSX files are allowed.");

        await ValidateFileSignatureAsync(file, extension);

        // Stored under the same private, non-wwwroot area as the
        // generated PR PDF (see GetPdfStorageRootPath's comment on the
        // controller) - a PO copy can carry vendor pricing/bank details,
        // so it gets the same "authenticated download only" treatment as
        // the PDF, not the public /uploads/ path attachments use.
        var directory = Path.Combine(
            pdfStorageRootPath, "purchase-requisitions", record.Id.ToString(), "po");

        Directory.CreateDirectory(directory);

        var generatedFileName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(directory, generatedFileName);

        byte[] fileBytes;

        await using (var output = new FileStream(
            destination, FileMode.CreateNew, FileAccess.Write, FileShare.None))
        {
            await file.CopyToAsync(output);
        }

        fileBytes = await File.ReadAllBytesAsync(destination);

        var trimmedPoNumber = string.IsNullOrWhiteSpace(poNumber) ? null : poNumber.Trim();

        record.PoNumber = trimmedPoNumber;
        record.PoDocumentPath =
            $"purchase-requisitions/{record.Id}/po/{generatedFileName}";
        record.PoUploadedAt = DateTime.UtcNow;
        record.PoUploadedByUserId = null;
        record.UpdatedAt = DateTime.UtcNow;

        AddAuditLog(record.Id, "PoUploaded", null,
            $"PO document uploaded via the Finance link ({notification.SentToEmail})." +
            (trimmedPoNumber != null ? $" PO Number: {trimmedPoNumber}." : string.Empty),
            "EmailLink");

        await _context.SaveChangesAsync();

        await SendPoReadyEmailAsync(record, Path.GetFileName(destination), fileBytes);

        return MapPublicFinanceView(notification, _publicApiBaseUrl);
    }

    /*
     * Best-effort, matching every other outbound email in this module -
     * a delivery failure must never undo the PO upload that's already
     * been committed to the database. Attaches the PO file's bytes
     * directly (same reasoning as the PDF attached to the Finance
     * notification) so the requester can "collect" it straight from
     * their inbox without needing to sign in.
     */
    private async Task SendPoReadyEmailAsync(
        Models.PurchaseRequisition record,
        string poFileName,
        byte[] poFileBytes)
    {
        if (record.RequestedByUser == null)
            return;

        try
        {
            var prLabel = record.PrNumber ?? $"#{record.Id}";
            var requester = record.RequestedByUser;

            var subject = $"Purchase Order ready: {prLabel}";
            var body = BuildPoReadyEmailHtml(record);

            var extension = Path.GetExtension(poFileName).ToLowerInvariant();
            var contentType = extension switch
            {
                ".pdf" => "application/pdf",
                ".jpg" or ".jpeg" => "image/jpeg",
                ".png" => "image/png",
                ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "application/octet-stream"
            };

            var attachments = new List<EmailAttachment>
            {
                new()
                {
                    FileName = poFileName,
                    ContentType = contentType,
                    Content = poFileBytes
                }
            };

            await _emailService.SendWithAttachmentsAsync(
                requester.Email, requester.FullName, subject, body, attachments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Failed to send the PO-ready email for purchase requisition {PurchaseRequisitionId}.",
                record.Id);
        }
    }

    private static string BuildFinanceNotificationEmailHtml(
        Models.PurchaseRequisition record,
        IReadOnlyList<PurchaseRequisitionAttachment> quotationAttachments,
        string reviewLink)
    {
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;

        var prLabel = record.PrNumber ?? $"#{record.Id}";
        var requesterName = record.RequestedByUser?.FullName ?? "A colleague";
        var vendorName = record.Vendor?.VendorName;

        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html>");
        sb.Append("<html><head><meta charset=\"utf-8\" />");
        sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.Append("<title></title></head>");
        sb.Append("<body style=\"margin:0;padding:0;background-color:" + EmailPageBg + ";\">");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailPageBg + ";padding:32px 16px;\">");
        sb.Append("<tr><td align=\"center\">");
        sb.Append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:100%;background-color:#ffffff;border-radius:12px;\">");

        sb.Append("<tr><td style=\"background-color:" + EmailApproveColor + ";padding:24px 32px;border-radius:12px 12px 0 0;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"width:44px;height:44px;background-color:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;\">");
        sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:15px;font-weight:700;color:" + EmailApproveColor + ";line-height:44px;\">PPS</span>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding-left:14px;vertical-align:middle;\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:17px;font-weight:700;color:#ffffff;\">PPS SmartAsset</div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:rgba(255,255,255,0.78);letter-spacing:0.05em;margin-top:2px;\">APPROVED — FINANCE ACTION NEEDED</div>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:32px;font-family:" + EmailFontStack + ";\">");

        sb.Append("<h1 style=\"margin:0 0 16px;font-size:21px;line-height:1.35;color:" + EmailSlateStrong + ";font-family:" + EmailFontStack + ";\">");
        sb.Append(Enc(prLabel) + " &mdash; " + Enc(record.Title));
        sb.Append("</h1>");

        sb.Append("<p style=\"margin:0 0 22px;font-size:14px;line-height:1.6;color:" + EmailSlateText + ";\">");
        sb.Append("This purchase requisition, raised by <strong>" + Enc(requesterName) + "</strong>, has been fully approved. Please verify the request and the attached quotation, then issue the PO and upload a copy using the secure link below.");
        sb.Append("</p>");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:22px;background-color:" + EmailPanelBg + ";border:1px solid " + EmailBorderColor + ";border-radius:8px;\">");
        sb.Append("<tr>");
        sb.Append("<td style=\"padding:14px 18px;width:50%;border-bottom:1px solid " + EmailBorderColor + ";\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Vendor</div>");
        sb.Append("<div style=\"font-size:13px;color:" + EmailSlateStrong + ";font-weight:600;margin-top:3px;\">" + (string.IsNullOrWhiteSpace(vendorName) ? "Not selected" : Enc(vendorName)) + "</div>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding:14px 18px;width:50%;border-bottom:1px solid " + EmailBorderColor + ";\">");
        sb.Append("<div style=\"font-size:10.5px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">Total Amount</div>");
        sb.Append("<div style=\"font-size:15px;color:" + EmailSlateStrong + ";font-weight:700;margin-top:3px;\">" + Enc(record.Currency) + " " + record.TotalAmount.ToString("N2") + "</div>");
        sb.Append("</td>");
        sb.Append("</tr>");
        sb.Append("</table>");

        if (quotationAttachments.Count > 0)
        {
            sb.Append("<div style=\"font-size:11px;font-weight:700;letter-spacing:0.05em;color:" + EmailSlateText + ";text-transform:uppercase;margin-bottom:8px;\">Vendor Quotation</div>");
            sb.Append("<ul style=\"margin:0 0 22px;padding-left:18px;\">");
            foreach (var attachment in quotationAttachments)
            {
                sb.Append("<li style=\"font-size:13px;color:" + EmailSlateText + ";margin-bottom:4px;\">" + Enc(attachment.FileName) + "</li>");
            }
            sb.Append("</ul>");
        }

        sb.Append("<p style=\"margin:0 0 8px;font-size:13px;color:" + EmailSlateText + ";\">The full purchase requisition PDF is attached to this email.</p>");

        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:16px 0 10px;\"><tr>");
        sb.Append("<td style=\"border-radius:8px;background-color:" + EmailApproveColor + ";\">");
        sb.Append("<a href=\"" + reviewLink + "\" style=\"display:inline-block;padding:13px 32px;font-family:" + EmailFontStack + ";font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;\">Verify &amp; Upload PO Copy</a>");
        sb.Append("</td>");
        sb.Append("</tr></table>");

        sb.Append("<p style=\"margin:10px 0 0;font-size:11.5px;line-height:1.6;color:" + EmailFaintText + ";\">");
        sb.Append("Link not working? Paste this into your browser: <a href=\"" + reviewLink + "\" style=\"color:" + EmailBrandColor + ";\">" + reviewLink + "</a>. This link stays usable for " + FinanceTokenValidityDays + " days, and can be revisited if the PO copy or number needs correcting.");
        sb.Append("</p>");

        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:20px 32px;background-color:" + EmailPanelBg + ";border-top:1px solid " + EmailBorderColor + ";border-radius:0 0 12px 12px;\">");
        sb.Append("<p style=\"margin:0;font-size:11px;color:" + EmailFaintText + ";line-height:1.6;font-family:" + EmailFontStack + ";\">");
        sb.Append("Once a PO copy is uploaded, " + Enc(requesterName) + " will automatically receive an email with the PO copy attached.");
        sb.Append("</p>");
        sb.Append("</td></tr>");

        sb.Append("</table>");
        sb.Append("</td></tr></table>");
        sb.Append("</body></html>");

        return sb.ToString();
    }

    private static string BuildPoReadyEmailHtml(Models.PurchaseRequisition record)
    {
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;

        var prLabel = record.PrNumber ?? $"#{record.Id}";
        var requesterName = record.RequestedByUser?.FullName ?? "there";

        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html>");
        sb.Append("<html><head><meta charset=\"utf-8\" />");
        sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.Append("<title></title></head>");
        sb.Append("<body style=\"margin:0;padding:0;background-color:" + EmailPageBg + ";\">");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailPageBg + ";padding:32px 16px;\">");
        sb.Append("<tr><td align=\"center\">");
        sb.Append("<table role=\"presentation\" width=\"600\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:600px;max-width:100%;background-color:#ffffff;border-radius:12px;\">");

        sb.Append("<tr><td style=\"background-color:" + EmailBrandColor + ";padding:24px 32px;border-radius:12px 12px 0 0;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"width:44px;height:44px;background-color:#ffffff;border-radius:9px;text-align:center;vertical-align:middle;\">");
        sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:15px;font-weight:700;color:" + EmailBrandColor + ";line-height:44px;\">PPS</span>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding-left:14px;vertical-align:middle;\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:17px;font-weight:700;color:#ffffff;\">PPS SmartAsset</div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:rgba(255,255,255,0.78);letter-spacing:0.05em;margin-top:2px;\">PURCHASE ORDER READY</div>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:32px;font-family:" + EmailFontStack + ";\">");

        sb.Append("<h1 style=\"margin:0 0 16px;font-size:21px;line-height:1.35;color:" + EmailSlateStrong + ";font-family:" + EmailFontStack + ";\">");
        sb.Append(Enc(prLabel) + " &mdash; " + Enc(record.Title));
        sb.Append("</h1>");

        sb.Append("<p style=\"margin:0 0 12px;font-size:14px;line-height:1.6;color:" + EmailSlateText + ";\">");
        sb.Append("Hi " + Enc(requesterName) + ", Finance has verified your purchase requisition and issued the Purchase Order.");
        sb.Append("</p>");

        sb.Append("<p style=\"margin:0 0 22px;font-size:14px;line-height:1.6;color:" + EmailSlateText + ";\">");
        sb.Append("The PO copy is attached to this email" +
            (string.IsNullOrWhiteSpace(record.PoNumber) ? "." : " (PO Number: <strong>" + Enc(record.PoNumber) + "</strong>).") );
        sb.Append("</p>");

        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:20px 32px;background-color:" + EmailPanelBg + ";border-top:1px solid " + EmailBorderColor + ";border-radius:0 0 12px 12px;\">");
        sb.Append("<p style=\"margin:0;font-size:11px;color:" + EmailFaintText + ";line-height:1.6;font-family:" + EmailFontStack + ";\">");
        sb.Append("Sign in to PPS SmartAsset to view the full purchase requisition details.");
        sb.Append("</p>");
        sb.Append("</td></tr>");

        sb.Append("</table>");
        sb.Append("</td></tr></table>");
        sb.Append("</body></html>");

        return sb.ToString();
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

    /*
     * Same access rule and "not under wwwroot" storage principle as
     * GetPdfFileAsync, but no lazy-generation branch - unlike the PDF, a
     * missing PO document just means Finance hasn't uploaded one yet,
     * there's nothing to generate on demand.
     */
    public async Task<(string PhysicalPath, string FileName)?> GetPoDocumentFileAsync(
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

        if (string.IsNullOrWhiteSpace(record.PoDocumentPath))
            return null;

        var physicalPath = Path.Combine(
            pdfStorageRootPath,
            record.PoDocumentPath.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(physicalPath))
            return null;

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
