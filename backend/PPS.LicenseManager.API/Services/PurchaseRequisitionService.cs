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

    // Added for the executive-ready redesign (dark header/table-header,
    // gold subtitle accent, tinted icon-circle backgrounds).
    private const string EmailHeaderNavy = "#0B1C3D";
    private const string EmailHeaderBorderNavy = "#24345C";
    private const string EmailHeaderMutedText = "#C7D0E4";
    private const string EmailFooterMutedText = "#AEB9D1";
    private const string EmailGoldAccent = "#F2BA2E";
    private const string EmailIconBlueBg = "#E8EEFB";
    private const string EmailIconAmberBg = "#FCEAD3";

    // Logo + icon set for the approval-request email, served as hosted
    // HTTPS images from wwwroot/branding via the /api/branding/* static
    // file route added in Program.cs (routed to this backend container by
    // the existing Cloudflare Tunnel ingress rule, which already matches
    // ^/(api|uploads)/.*). This replaces an earlier base64 data-URI
    // approach: Outlook desktop's Word rendering engine does not reliably
    // display data:-URI <img> tags, so the logo silently failed to render
    // for O365 recipients even though it worked fine in Gmail/Apple Mail.
    private static string BrandingAssetUrl(string publicApiBaseUrl, string fileName) =>
        publicApiBaseUrl + "/api/branding/" + fileName;

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
            .Include(x => x.PoUploadedByUser)
            .Include(x => x.PoUploadHistory);
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

            PoDate = r.PoDate,
            PoAmount = r.PoAmount,
            PoUploadedByEmail = r.PoUploadedByEmail,
            PoUploadHistory = r.PoUploadHistory
                .OrderBy(h => h.UploadedAt)
                .Select(h => new PurchaseRequisitionPoUploadResponse
                {
                    Id = h.Id,
                    PoNumber = h.PoNumber,
                    PoDate = h.PoDate,
                    PoAmount = h.PoAmount,
                    HasPoDocument = !string.IsNullOrWhiteSpace(h.PoDocumentPath),
                    UploadedAt = h.UploadedAt,
                    UploadedByEmail = h.UploadedByEmail
                })
                .ToList(),

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

        var response = Map(record, requestingUserId);
        response.FulfilledByItems = await GetFulfillmentItemsAsync(record.Id);

        return response;
    }

    // "Fulfilled by" section on the PR detail view - every Asset/
    // LicensePurchase actually created against this PR so far. Only
    // called from the single-PR GetByIdAsync (not any list endpoint), so
    // the extra two queries here are cheap and scoped to one PR.
    private async Task<List<PurchaseRequisitionFulfillmentItemResponse>> GetFulfillmentItemsAsync(
        int purchaseRequisitionId)
    {
        var assetItems = await _context.Assets
            .Where(a => a.PurchaseRequisitionId == purchaseRequisitionId)
            .Select(a => new PurchaseRequisitionFulfillmentItemResponse
            {
                Type = "Asset",
                RecordId = a.Id,
                LineItemId = a.PurchaseRequisitionLineItemId!.Value,
                Description = a.AssetTag + " - " + a.AssetName,
                Quantity = 1,
                Cost = a.PurchaseCost,
                PurchaseDate = a.PurchaseDate
            })
            .ToListAsync();

        // Projected with PurchaseDate still DateOnly here (a plain column
        // read, always safely translatable) and converted to DateTime
        // afterward in memory, rather than calling
        // DateOnly.ToDateTime(TimeOnly) inside the query itself - that
        // combinator isn't part of EF Core/Npgsql's well-supported
        // DateOnly translation surface, and every other DateOnly usage in
        // this codebase (see AnalyticsService.cs) only ever operates on
        // already-materialized data, never inside a translated IQueryable.
        var licenseItemsRaw = await _context.LicensePurchases
            .Where(lp => lp.PurchaseRequisitionId == purchaseRequisitionId)
            .Select(lp => new
            {
                lp.Id,
                LineItemId = lp.PurchaseRequisitionLineItemId!.Value,
                Description = lp.Software.Name + " (" + lp.LicenseType + ")",
                lp.TotalLicenses,
                lp.Cost,
                lp.PurchaseDate
            })
            .ToListAsync();

        var licenseItems = licenseItemsRaw
            .Select(lp => new PurchaseRequisitionFulfillmentItemResponse
            {
                Type = "License",
                RecordId = lp.Id,
                LineItemId = lp.LineItemId,
                Description = lp.Description,
                Quantity = lp.TotalLicenses,
                Cost = lp.Cost,
                PurchaseDate = lp.PurchaseDate.ToDateTime(TimeOnly.MinValue)
            })
            .ToList();

        return assetItems
            .Concat(licenseItems)
            .OrderBy(x => x.LineItemId)
            .ThenBy(x => x.Type)
            .ToList();
    }

    // Available-to-link PR lines for the Asset/License purchase creation
    // forms - every line item on an Approved PR that still has remaining
    // unfulfilled quantity. Small dataset in practice (Approved PRs with
    // open lines only), so the two aggregate queries plus in-memory join
    // below are simpler and cheap enough rather than a single hand-rolled
    // SQL LEFT JOIN.
    public async Task<List<PurchaseRequisitionAvailableLineResponse>> GetAvailableLinesForLinkingAsync()
    {
        var lines = await _context.PurchaseRequisitionLineItems
            .Include(l => l.PurchaseRequisition)
            .Where(l => l.PurchaseRequisition.Status == "Approved")
            .OrderByDescending(l => l.PurchaseRequisition.ApprovedAt)
            .ThenBy(l => l.LineNumber)
            .ToListAsync();

        if (lines.Count == 0)
        {
            return new List<PurchaseRequisitionAvailableLineResponse>();
        }

        var lineIds = lines.Select(l => l.Id).ToList();

        var assetCounts = await _context.Assets
            .Where(a =>
                a.PurchaseRequisitionLineItemId != null &&
                lineIds.Contains(a.PurchaseRequisitionLineItemId.Value))
            .GroupBy(a => a.PurchaseRequisitionLineItemId!.Value)
            .Select(g => new { LineItemId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.LineItemId, x => (decimal)x.Count);

        var licenseQtys = await _context.LicensePurchases
            .Where(lp =>
                lp.PurchaseRequisitionLineItemId != null &&
                lineIds.Contains(lp.PurchaseRequisitionLineItemId.Value))
            .GroupBy(lp => lp.PurchaseRequisitionLineItemId!.Value)
            .Select(g => new { LineItemId = g.Key, Total = g.Sum(x => (decimal)x.TotalLicenses) })
            .ToDictionaryAsync(x => x.LineItemId, x => x.Total);

        var result = new List<PurchaseRequisitionAvailableLineResponse>();

        foreach (var line in lines)
        {
            var fulfilled =
                (assetCounts.TryGetValue(line.Id, out var assetCount) ? assetCount : 0m) +
                (licenseQtys.TryGetValue(line.Id, out var licenseQty) ? licenseQty : 0m);

            var remaining = line.Quantity - fulfilled;

            if (remaining <= 0)
            {
                continue;
            }

            result.Add(new PurchaseRequisitionAvailableLineResponse
            {
                LineItemId = line.Id,
                PurchaseRequisitionId = line.PurchaseRequisitionId,
                PrNumber = line.PurchaseRequisition.PrNumber ?? string.Empty,
                ItemDescription = line.ItemDescription,
                Quantity = line.Quantity,
                FulfilledQuantity = fulfilled,
                RemainingQuantity = remaining
            });
        }

        return result;
    }

    // The audit/reconciliation report - every Asset/LicensePurchase across
    // the whole system that has ever been linked to a PR, regardless of
    // that PR's current status (a PR could since have had later revisions,
    // but the link recorded at creation time is a historical fact and
    // stays reportable). Vendor prefers the PR's own Vendor (the actual
    // procurement vendor) and falls back to the License purchase's own
    // free-text Vendor field only when the PR has none set - Asset has no
    // equivalent fallback (its Vendor/VendorId is rental tracking, a
    // different concept - see Asset.VendorId's model comment).
    public async Task<List<PurchaseRequisitionFulfillmentReportRow>> GetFulfillmentReportAsync()
    {
        var assetRows = await _context.Assets
            .Where(a => a.PurchaseRequisitionId != null)
            .Select(a => new PurchaseRequisitionFulfillmentReportRow
            {
                Type = "Asset",
                ItemDescription = a.AssetTag + " - " + a.AssetName,
                PrNumber = a.PurchaseRequisition!.PrNumber ?? string.Empty,
                PoNumber = a.PurchaseRequisition.PoNumber,
                PrApprovedAt = a.PurchaseRequisition.ApprovedAt,
                PurchaseDate = a.PurchaseDate,
                Vendor = a.PurchaseRequisition.Vendor != null
                    ? a.PurchaseRequisition.Vendor.VendorName
                    : null,
                Cost = a.PurchaseCost,
                RequestedByUserName = a.PurchaseRequisition.RequestedByUser.FullName
            })
            .ToListAsync();

        // Same DateOnly-stays-DateOnly-until-materialized reasoning as
        // GetFulfillmentItemsAsync above.
        var licenseRowsRaw = await _context.LicensePurchases
            .Where(lp => lp.PurchaseRequisitionId != null)
            .Select(lp => new
            {
                ItemDescription = lp.Software.Name + " (" + lp.LicenseType + ")",
                PrNumber = lp.PurchaseRequisition!.PrNumber ?? string.Empty,
                lp.PurchaseRequisition.PoNumber,
                lp.PurchaseRequisition.ApprovedAt,
                lp.PurchaseDate,
                Vendor = lp.PurchaseRequisition.Vendor != null
                    ? lp.PurchaseRequisition.Vendor.VendorName
                    : lp.Vendor,
                lp.Cost,
                RequestedByUserName = lp.PurchaseRequisition.RequestedByUser.FullName
            })
            .ToListAsync();

        var licenseRows = licenseRowsRaw
            .Select(lp => new PurchaseRequisitionFulfillmentReportRow
            {
                Type = "License",
                ItemDescription = lp.ItemDescription,
                PrNumber = lp.PrNumber,
                PoNumber = lp.PoNumber,
                PrApprovedAt = lp.ApprovedAt,
                PurchaseDate = lp.PurchaseDate.ToDateTime(TimeOnly.MinValue),
                Vendor = lp.Vendor,
                Cost = lp.Cost,
                RequestedByUserName = lp.RequestedByUserName
            })
            .ToList();

        return assetRows
            .Concat(licenseRows)
            .OrderByDescending(r => r.PrApprovedAt)
            .ToList();
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
            // Department/Attachments/PreviousRevision: not needed by the
            // pre-existing submit logic below, only by the redesigned
            // approval-request email (BuildApprovalRequestEmailHtml) this
            // method goes on to send for the first stage - see that
            // method's own comment for why each is there.
            .Include(x => x.Department)
            .Include(x => x.Attachments)
            .Include(x => x.PreviousRevision)
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
            // LineItems/Department/Attachments/PreviousRevision: needed by
            // BuildApprovalRequestEmailHtml for the NEXT stage's email this
            // method goes on to send (via DecideStepCoreAsync) - not by the
            // decision logic itself.
            .Include(x => x.LineItems)
            .Include(x => x.Department)
            .Include(x => x.Attachments)
            .Include(x => x.PreviousRevision)
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
            // Department/Attachments/PreviousRevision: needed by
            // BuildApprovalRequestEmailHtml for the NEXT stage's email a
            // DecideStepByTokenAsync call goes on to send, same as the
            // equivalent Includes on DecideStepAsync's own query.
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.Department)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.Attachments)
            .Include(t => t.ApprovalStep)
                .ThenInclude(s => s.PurchaseRequisition)
                    .ThenInclude(r => r.PreviousRevision)
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
            var tokenExpiresAt = DateTime.UtcNow.AddDays(ApprovalTokenValidityDays);

            _context.PurchaseRequisitionApprovalTokens.Add(new PurchaseRequisitionApprovalToken
            {
                PurchaseRequisitionApprovalStepId = step.Id,
                TokenHash = HashToken(rawToken),
                ExpiresAt = tokenExpiresAt,
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
                record, step, allSteps, approverDisplayName, link, tokenExpiresAt, _publicApiBaseUrl);

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
     * Always appends one more row after every real ApprovalStep: Finance
     * PO issuance. This is NOT a PurchaseRequisitionApprovalStep row -
     * Finance's involvement is a separate mechanism entirely
     * (IssueFinanceTokenAndSendNotificationAsync, fired only once
     * isFinalApproval is true) - so its status is derived from `record`
     * directly (Status/PoNumber) rather than from `allSteps`:
     *   - record.Status == "Rejected": Skipped, same treatment as any
     *     future approval stage a rejection short-circuits.
     *   - record.Status == "Approved" and PoNumber set: done (PO issued).
     *   - record.Status == "Approved" and PoNumber still null: in
     *     progress (Finance notified, hasn't uploaded a PO yet).
     *   - otherwise (still Draft/InApproval): not started yet - every
     *     approval stage above still has to clear first.
     *
     * Deliberately built with nested tables and inline styles only (no
     * <style> block, no flexbox/grid) - this is the only layout approach
     * that renders consistently across Outlook's Word rendering engine,
     * Gmail, and mobile mail clients.
     */
    private static string BuildApprovalStepperHtml(
        Models.PurchaseRequisition record,
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

            // Never "0" here - the Finance row appended below this loop
            // is now always the true last row.
            var bottomPadding = "18px";

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

        // ===== Finance: PO Issuance (always the final row - see method
        // comment above for why this is derived from `record`, not a
        // PurchaseRequisitionApprovalStep). =====
        string financeCircleColor;
        var financeCircleTextColor = "#ffffff";
        string financeCircleContent;
        string financeStatusLabel;
        string financeStatusColor;
        var financeCircleBorder = "";

        if (record.Status == "Rejected")
        {
            financeCircleColor = "#CBD5E1";
            financeCircleContent = "&#8211;";
            financeStatusLabel = "Skipped";
            financeStatusColor = EmailFaintText;
            financeCircleTextColor = "#475569";
        }
        else if (record.Status == "Approved" && !string.IsNullOrWhiteSpace(record.PoNumber))
        {
            financeCircleColor = EmailApproveColor;
            financeCircleContent = "&#10003;";
            financeStatusLabel = "PO Issued";
            financeStatusColor = EmailApproveColor;
        }
        else if (record.Status == "Approved")
        {
            financeCircleColor = EmailAmberColor;
            financeCircleContent = "&#8377;";
            financeStatusLabel = "Awaiting Finance";
            financeStatusColor = EmailAmberColor;
        }
        else
        {
            financeCircleColor = "#ffffff";
            financeCircleContent = "&#8377;";
            financeStatusLabel = "Not started yet";
            financeStatusColor = EmailFaintText;
            financeCircleTextColor = EmailMutedText;
            financeCircleBorder = "border:2px dashed #CBD5E1;";
        }

        sb.Append("<tr>");
        sb.Append("<td style=\"width:32px;vertical-align:top;padding:0;\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr><td style=\"width:24px;height:24px;border-radius:12px;background-color:" + financeCircleColor + ";" + financeCircleBorder + "text-align:center;\">");
        sb.Append("<span style=\"font-family:" + EmailFontStack + ";font-size:12px;font-weight:700;color:" + financeCircleTextColor + ";line-height:24px;\">" + financeCircleContent + "</span>");
        sb.Append("</td></tr></table>");
        sb.Append("</td>");
        sb.Append("<td style=\"padding:0 0 0 12px;vertical-align:top;\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:13px;font-weight:600;color:" + EmailSlateStrong + ";\">Finance: PO Issuance <span style=\"color:" + EmailFaintText + ";font-weight:400;\">(after full approval)</span></div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:12px;color:" + financeStatusColor + ";margin-top:2px;font-weight:600;\">" + financeStatusLabel + "</div>");
        sb.Append("</td>");
        sb.Append("</tr>");

        sb.Append("</table>");

        return sb.ToString();
    }

    // "VendorQuotation"/"Supporting" are the only two real AttachmentType
    // values the schema allows (enforced in UploadAttachmentAsync) - this
    // only humanizes those exact strings for display, never invents a
    // category real data doesn't have.
    private static string FriendlyAttachmentType(string attachmentType) => attachmentType switch
    {
        "VendorQuotation" => "Vendor Quotation",
        "Supporting" => "Supporting Document",
        _ => attachmentType
    };

    // Derived from the real uploaded file's own extension - never a
    // fabricated/assumed format.
    private static string AttachmentFormatLabel(string fileName)
    {
        var ext = System.IO.Path.GetExtension(fileName);
        return string.IsNullOrWhiteSpace(ext) ? "FILE" : ext.TrimStart('.').ToUpperInvariant();
    }

    /*
     * Renders the "Approval Workflow" section used only by the
     * approval-request email: a horizontal 4+ column stepper (every real
     * ApprovalStep plus the same always-appended Finance PO-issuance row
     * BuildApprovalStepperHtml uses) for desktop-width clients, and a
     * vertical one-stage-per-row fallback for narrow screens - toggled via
     * the .desktop-only/.mobile-only classes declared in
     * BuildApprovalRequestEmailHtml's own <style> block. This is
     * deliberately a SEPARATE method from BuildApprovalStepperHtml (which
     * stays exactly as-is, vertical-only) rather than a shared one,
     * because the responsive toggle only works inside a document that
     * actually defines those two CSS classes - BuildOutcomeEmailHtml's
     * independent HTML document does not, so reusing this here would
     * silently show both the desktop and mobile renderings stacked on top
     * of each other there.
     */
    private static string BuildApprovalWorkflowHorizontalHtml(
        Models.PurchaseRequisition record,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        int? highlightStepId)
    {
        // CIRCLE_PX must match the actual box drawn by Circle() below -
        // used only for the connector arrow's vertical-centering math.
        // Per feedback: a smaller circle than the original 32px.
        const int circlePx = 24;
        string Circle(string content, string bg, string textColor, string extraStyle = "") =>
            "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
            "<td style=\"width:" + circlePx + "px;height:" + circlePx + "px;border-radius:" + (circlePx / 2) + "px;background-color:" + bg + ";" + extraStyle + "text-align:center;\">" +
            "<span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:" + textColor + ";line-height:" + circlePx + "px;\">" + content + "</span>" +
            "</td></tr></table>";

        var ordered = allSteps.OrderBy(s => s.StepOrder).ToList();
        var stages = new List<(string Circle, string TopLabel, string Name, string Status, string StatusColor, string Sub, bool Done)>();

        foreach (var s in ordered)
        {
            string circle, statusLabel, statusColor, sub = "";
            var approverName = s.AssignedApproverContactId.HasValue
                ? (s.AssignedApproverContact?.FullName ?? "External contact")
                : (s.AssignedApproverUser?.FullName ?? "Unassigned");

            if (s.Status == "Approved")
            {
                circle = Circle("&#10003;", EmailApproveColor, "#ffffff");
                statusLabel = "Approved";
                statusColor = EmailApproveColor;
                if (s.DecidedAt.HasValue) sub = s.DecidedAt.Value.ToString("dd MMM yyyy");
            }
            else if (s.Status == "Rejected")
            {
                circle = Circle("&#10005;", EmailRejectColor, "#ffffff");
                statusLabel = "Rejected";
                statusColor = EmailRejectColor;
                if (s.DecidedAt.HasValue) sub = s.DecidedAt.Value.ToString("dd MMM yyyy");
            }
            else if (s.Status == "Skipped")
            {
                circle = Circle("&#8211;", "#CBD5E1", "#475569");
                statusLabel = "Skipped";
                statusColor = EmailFaintText;
            }
            else if (s.Id == highlightStepId)
            {
                circle = Circle(s.StepOrder.ToString(), EmailAmberColor, "#ffffff");
                statusLabel = "Awaiting Your Decision";
                statusColor = EmailAmberColor;
                sub = "(You are here)";
            }
            else
            {
                circle = Circle(s.StepOrder.ToString(), "#ffffff", EmailMutedText, "border:2px solid " + EmailBorderColor + ";");
                statusLabel = "Not Started";
                statusColor = EmailFaintText;
            }

            // "done" drives the connector AFTER this stage: green once
            // this stage has actually been decided (Approved), neutral
            // gray otherwise - an amber "awaiting decision" stage hasn't
            // forwarded anything yet, so its outgoing connector stays gray.
            stages.Add((circle, "Stage " + s.StepOrder, approverName, statusLabel, statusColor, sub, s.Status == "Approved"));
        }

        string financeCircle, financeStatus, financeColor;
        if (record.Status == "Rejected")
        {
            financeCircle = Circle("&#8211;", "#CBD5E1", "#475569");
            financeStatus = "Skipped";
            financeColor = EmailFaintText;
        }
        else if (record.Status == "Approved" && !string.IsNullOrWhiteSpace(record.PoNumber))
        {
            financeCircle = Circle("&#10003;", EmailApproveColor, "#ffffff");
            financeStatus = "PO Issued";
            financeColor = EmailApproveColor;
        }
        else if (record.Status == "Approved")
        {
            financeCircle = Circle("&#8377;", EmailAmberColor, "#ffffff");
            financeStatus = "Awaiting Finance";
            financeColor = EmailAmberColor;
        }
        else
        {
            financeCircle = Circle("&#8377;", "#ffffff", EmailMutedText, "border:2px dashed " + EmailBorderColor + ";");
            financeStatus = "Not Started";
            financeColor = EmailFaintText;
        }
        stages.Add((financeCircle, "Finance", "Finance", financeStatus, financeColor, "", false));

        var n = stages.Count;
        // Content width the stepper table actually renders at: the 640px
        // email container minus this section's own 28px+28px side padding
        // (see the "APPROVAL WORKFLOW" <td> below).
        const int contentPx = 640 - 28 - 28;
        // Fixed pixel width per connector column. The previous version
        // gave connector columns NO explicit width while stage columns
        // claimed 100%/n each - with only 2 stage columns (a single-
        // approval-stage PR + Finance, e.g. one real production PR) that
        // leaves nothing for the connector column to render in, and
        // different email clients resolved the resulting over-100% table
        // to different (often near-0px) widths for it - real inboxes
        // collapsed it to an invisible sliver, which is why a live
        // approval email showed a bare gap between the two stage circles
        // with no line at all. A small FIXED connector width, with stage
        // columns sized off the remainder, keeps every column honest
        // regardless of how many approval stages a PR has.
        const int connectorPx = 44;
        var nConnectors = n - 1;
        var stagePct = (contentPx - connectorPx * nConnectors) / (double)contentPx * 100.0 / n;
        var stagePctStr = stagePct.ToString("0.00", System.Globalization.CultureInfo.InvariantCulture);

        var circlesRow = new StringBuilder("<tr>");
        var labelsRow = new StringBuilder("<tr>");
        for (var i = 0; i < n; i++)
        {
            var st = stages[i];
            circlesRow.Append("<td align=\"center\" valign=\"top\" style=\"width:" + stagePctStr + "%;\">" + st.Circle + "</td>");
            if (i < n - 1)
            {
                // Connector = a right-pointing arrow glyph, vertically
                // centered on the circle row via a fixed-height/matching
                // line-height cell - the same reliable email-safe
                // centering technique the circles themselves use. Reads
                // unambiguously as "forwarding to the next approval stage"
                // without relying on background-color line rendering
                // (which real clients collapsed away entirely - see
                // connectorPx's comment above) or negative-margin tricks,
                // both unreliable across real email clients. Green once
                // the stage to its left is actually Approved; neutral gray
                // otherwise (including the currently-awaiting amber stage,
                // which hasn't forwarded anything yet).
                var arrowColor = st.Done ? EmailApproveColor : EmailFaintText;
                circlesRow.Append("<td align=\"center\" style=\"width:" + connectorPx + "px;height:" + circlePx + "px;line-height:" + circlePx + "px;font-family:" + EmailFontStack + ";font-size:17px;font-weight:700;color:" + arrowColor + ";\" valign=\"middle\">&#8594;</td>");
            }
            // Per feedback on the live email: keep the circle/arrow exactly
            // as they are (green filled + tick once Approved, arrow
            // forwarding to the next stage) but drop everything under the
            // circle except the approver's name - no "Stage N" label, no
            // status text, no "(You are here)"/decided-date sub-line. The
            // circle's own color/fill already communicates status.
            labelsRow.Append("<td align=\"center\" valign=\"top\" style=\"width:" + stagePctStr + "%;padding-top:9px;\">" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:13px;font-weight:700;color:" + EmailSlateStrong + ";\">" + System.Net.WebUtility.HtmlEncode(st.Name) + "</div>" +
                "</td>");
            if (i < n - 1) labelsRow.Append("<td></td>");
        }
        circlesRow.Append("</tr>");
        labelsRow.Append("</tr>");

        var mobileRows = new StringBuilder();
        for (var i = 0; i < n; i++)
        {
            var st = stages[i];
            var isLast = i == n - 1;
            var connectorColor = st.Done ? EmailApproveColor : EmailBorderColor;
            var connector = isLast ? "" :
                "<div style=\"width:2px;height:22px;background-color:" + connectorColor + ";margin:2px 0 2px " + (circlePx / 2 - 1) + "px;\"></div>";
            // Same simplification as the desktop labels row above - name
            // only, no status text/sub-line.
            mobileRows.Append("<tr><td style=\"padding:0 20px;\">" +
                "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
                "<td valign=\"top\">" + st.Circle + "</td>" +
                "<td style=\"padding-left:12px;\" valign=\"middle\">" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:14px;font-weight:700;color:" + EmailSlateStrong + ";\">" + System.Net.WebUtility.HtmlEncode(st.Name) + "</div>" +
                "</td></tr></table>" + connector + "</td></tr>");
        }

        var sb = new StringBuilder();
        sb.Append("<tr><td class=\"desktop-only\" style=\"padding:26px 28px 28px;\">");
        sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:" + EmailSlateStrong + ";text-transform:uppercase;margin-bottom:16px;border-left:3px solid " + EmailBrandColor + ";padding-left:8px;\">Approval Workflow</div>");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">");
        sb.Append(circlesRow.ToString());
        sb.Append(labelsRow.ToString());
        sb.Append("</table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"padding:0;\">");
        sb.Append("<table role=\"presentation\" class=\"mobile-only\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">");
        sb.Append("<tr><td style=\"padding:26px 20px 16px;\">");
        sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:" + EmailSlateStrong + ";text-transform:uppercase;border-left:3px solid " + EmailBrandColor + ";padding-left:8px;\">Approval Workflow</div>");
        sb.Append("</td></tr>");
        sb.Append(mobileRows.ToString());
        sb.Append("<tr><td style=\"height:12px;line-height:12px;font-size:1px;\">&nbsp;</td></tr>");
        sb.Append("</table>");
        sb.Append("</td></tr>");

        return sb.ToString();
    }

    /*
     * Full HTML for the approval-request email - redesigned (per a
     * management-approved visual reference) to an executive-ready,
     * O365/Outlook-safe layout: a dark-navy header with a hosted logo, an
     * icon-led metadata strip (Request ID/Submitted/Status), icon-led
     * Requested By/Entity rows, an itemized Supporting Documents list with
     * real per-file links, a full line-item table with GST breakdown and
     * Grand Total, a single "Review & Approve" CTA, and a responsive
     * (horizontal desktop / vertical mobile) Approval Workflow stepper.
     *
     * Two deliberate departures from the visual reference, both for
     * correctness rather than fidelity: the revision-context line says
     * "previously approved" rather than "rejected" (CreateRevisionAsync
     * only ever allows revising an already-Approved PR, never a rejected
     * one), and the CTA links to the plain reviewLink rather than a
     * pre-filled ?action=approve one - the portal landing page is the only
     * place a decision is ever actually recorded (see the security
     * disclaimer below), so a single neutral link avoids visually biasing
     * the reader toward Approve before they have reviewed anything.
     *
     * Images (logo + icon set) are hosted HTTPS URLs under
     * {publicApiBaseUrl}/api/branding/*, not base64 data URIs - see
     * BrandingAssetUrl's comment for why.
     *
     * Every field rendered here comes from a column or navigation that's
     * already real on `record` - nothing is fabricated. Cost Center,
     * Priority, and Required-By date were deliberately left out rather
     * than invented, matching the same "Not Specified" discipline used
     * elsewhere in this module. Department and Vendor - present in the
     * visual reference's earlier iteration but not its final metadata
     * rows - are kept as a compact line under the title rather than
     * dropped outright, since they were real, previously-requested
     * context.
     */
    private static string BuildApprovalRequestEmailHtml(
        Models.PurchaseRequisition record,
        PurchaseRequisitionApprovalStep? step,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        string approverDisplayName,
        string reviewLink,
        DateTime tokenExpiresAt,
        string publicApiBaseUrl,
        // The CTA text differs for the one non-approver recipient of this
        // same template - Finance, once a PR is fully approved (see
        // BuildFinanceNotificationEmailHtml below, which calls this method
        // with step: null and its own CTA copy) - everyone else gets the
        // defaults below. Keeping this one template for both, rather than
        // a separate simpler one for Finance, is deliberate: per feedback,
        // every recipient (each approver, and Finance) should see the same
        // header/metadata/justification/documents/line-items+GST/stepper
        // layout, not a cut-down version for Finance.
        string ctaBadgeText = "YOUR ACTION IS REQUIRED",
        string ctaBodyText = "Please review the details and record your decision on the PPS SmartAsset portal.",
        string ctaButtonLabel = "REVIEW & APPROVE",
        string ctaFooterText = "This will redirect you to the PPS SmartAsset portal<br/>to record your decision securely.")
    {
        // step is null only for the Finance recipient - by the time Finance
        // is notified every approval step is already Approved, so there is
        // no "current step" to highlight or report a stage number for.
        var isFinanceMode = step is null;
        string Enc(string? value) => System.Net.WebUtility.HtmlEncode(value) ?? string.Empty;
        string Icon(string fileName) => BrandingAssetUrl(publicApiBaseUrl, fileName);

        var prLabel = record.PrNumber ?? $"#{record.Id}";
        var requesterName = record.RequestedByUser?.FullName ?? "A colleague";
        var employeeCode = record.RequestedByUser?.EmployeeCode;
        var departmentName = record.Department?.DepartmentName;
        var companyName = record.Company?.Name;
        var gstin = record.Company?.GSTNumber;
        var vendorName = record.Vendor?.VendorName;

        var isRevision = record.RevisionNumber > 0;
        var previousPrLabel = record.PreviousRevision?.PrNumber;

        var submittedLabel = (record.SubmittedAt ?? record.CreatedAt).ToString("dd MMM yyyy");
        var pendingDays = record.SubmittedAt.HasValue
            ? (int)Math.Floor((DateTime.UtcNow - record.SubmittedAt.Value).TotalDays)
            : 0;

        var attachmentsOrdered = record.Attachments.OrderBy(a => a.UploadedAt).ToList();
        const int maxAttachmentsShown = 4;
        var shownAttachments = attachmentsOrdered.Take(maxAttachmentsShown).ToList();
        var remainingAttachmentCount = attachmentsOrdered.Count - shownAttachments.Count;
        var preheader = isFinanceMode
            ? prLabel + ": " + record.Title + " — " + record.Currency + " " +
              record.TotalAmount.ToString("N2") + " has been fully approved and is awaiting PO issuance."
            : prLabel + ": " + record.Title + " — " + record.Currency + " " +
              record.TotalAmount.ToString("N2") + " is waiting on your approval " +
              "(stage " + step!.StepOrder + " of " + record.RequiredApprovalStageCount + ").";

        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html>");
        sb.Append("<html lang=\"en\" xmlns:v=\"urn:schemas-microsoft-com:vml\" xmlns:o=\"urn:schemas-microsoft-com:office:office\"><head>");
        sb.Append("<meta charset=\"utf-8\" />");
        sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
        sb.Append("<meta name=\"x-apple-disable-message-reformatting\" />");
        sb.Append("<meta http-equiv=\"X-UA-Compatible\" content=\"IE=edge\" />");
        sb.Append("<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->");
        sb.Append("<title></title>");
        // Outlook desktop (Word engine) never processes @media, so it only
        // ever sees the DEFAULT .mobile-only rule below (display:none) -
        // meaning it always renders the desktop-only blocks and never the
        // mobile-only ones, which is exactly the layout that host needs. A
        // real mobile client that DOES support @media (Outlook mobile app,
        // OWA, Gmail, Apple Mail) gets the query's swap instead. This
        // progressive-disclosure approach replaced an earlier attempt at
        // collapsing table cells via display:block, which left the
        // metadata strip's divider cells stuck mid-row on narrow screens.
        sb.Append("<style>");
        sb.Append("body,table,td{font-family:" + EmailFontStack + ";}");
        sb.Append("table,td{mso-table-lspace:0pt;mso-table-rspace:0pt;border-collapse:collapse;}");
        sb.Append("img{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}");
        sb.Append(".mobile-only{display:none !important;}");
        sb.Append("@media only screen and (max-width:640px){");
        sb.Append(".email-container{width:100% !important;}");
        sb.Append(".stack-col{display:block !important;width:100% !important;}");
        // Business Justification / Supporting Documents: side-by-side on
        // desktop via padding-left/right:14px on each column - once
        // stacked on mobile that same padding just reads as a stray left
        // indent on the second column, with no matching visual gap above
        // it. Reset the horizontal padding and swap in a real vertical
        // gap instead.
        sb.Append(".stack-col-a{padding-right:0 !important;}");
        sb.Append(".stack-col-b{padding-left:0 !important;padding-top:20px !important;}");
        sb.Append(".px-mobile{padding-left:20px !important;padding-right:20px !important;}");
        sb.Append(".desktop-only{display:none !important;}");
        sb.Append("table.mobile-only{display:table !important;}");
        sb.Append("div.mobile-only,td.mobile-only{display:block !important;}");
        sb.Append("}");
        sb.Append("</style>");
        sb.Append("</head>");
        sb.Append("<body style=\"margin:0;padding:0;background-color:" + EmailPageBg + ";\">");

        sb.Append("<div style=\"display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;\">");
        sb.Append(Enc(preheader));
        sb.Append("&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>");

        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailPageBg + ";\">");
        sb.Append("<tr><td align=\"center\" style=\"padding:24px 12px;\">");
        sb.Append("<!--[if mso]><table role=\"presentation\" width=\"640\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" align=\"center\"><tr><td><![endif]-->");
        sb.Append("<table role=\"presentation\" class=\"email-container\" width=\"640\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"width:640px;max-width:100%;background-color:#ffffff;\">");

        // ===== HEADER : logo + system name, plus a small "Secure /
        // Confidential / Automated" badge top-right. =====
        sb.Append("<tr><td style=\"background-color:" + EmailHeaderNavy + ";padding:22px 28px;\" class=\"px-mobile\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td valign=\"middle\">");
        sb.Append("<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"width:46px;height:46px;background-color:#ffffff;border-radius:8px;text-align:center;vertical-align:middle;\" valign=\"middle\">");
        sb.Append("<img src=\"" + Icon("logo.jpg") + "\" width=\"46\" height=\"46\" alt=\"PPS\" style=\"display:block;border:0;width:46px;height:46px;border-radius:8px;\" />");
        sb.Append("</td>");
        sb.Append("<td style=\"padding-left:12px;\" valign=\"middle\">");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:19px;font-weight:700;color:#ffffff;\">PPS SmartAsset</div>");
        sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11.5px;font-weight:700;color:" + EmailGoldAccent + ";letter-spacing:0.05em;margin-top:2px;\">PURCHASE REQUISITION APPROVAL</div>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td>");
        sb.Append("<td align=\"right\" valign=\"middle\" style=\"white-space:nowrap;\">");
        sb.Append("<img src=\"" + Icon("icon-shield-white.png") + "\" width=\"13\" height=\"13\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:13px;height:13px;margin-right:5px;\" /><span style=\"font-family:" + EmailFontStack + ";font-size:11.5px;color:" + EmailHeaderMutedText + ";vertical-align:middle;\">Secure &middot; Confidential &middot; Automated</span>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        // ===== METADATA STRIP : Request ID / Submitted / Status, each
        // with a small icon - desktop as 3 columns side by side, mobile as
        // stacked rows (see the .mobile-only/.desktop-only style above). =====
        var pendingSub = pendingDays >= 1
            ? "<div style=\"font-family:" + EmailFontStack + ";font-size:10.5px;color:" + EmailRejectColor + ";font-weight:600;margin-top:1px;\">Pending " + pendingDays + (pendingDays == 1 ? " day" : " days") + "</div>"
            : "";
        // "Awaiting Finance" mirrors the exact wording the workflow
        // stepper already uses for this same state (see the Finance
        // circle's status in BuildApprovalWorkflowHorizontalHtml) - same
        // amber color/icon as an approver's "Awaiting Your Decision", no
        // new color introduced.
        var statusValueText = isFinanceMode ? "Awaiting Finance" : "Awaiting Your Decision";
        var statusSubText = isFinanceMode ? "" : ("Stage " + step!.StepOrder + " of " + record.RequiredApprovalStageCount);

        sb.Append("<tr><td class=\"desktop-only\" style=\"background-color:#ffffff;border-bottom:1px solid " + EmailBorderColor + ";\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append(MetaCard(Icon("icon-document-navy.png"), EmailIconBlueBg, "PR Number", Enc(prLabel), "", "", EmailSlateStrong));
        sb.Append("<td style=\"width:1px;background-color:" + EmailBorderColor + ";font-size:0;line-height:0;\">&nbsp;</td>");
        sb.Append(MetaCard(Icon("icon-calendar-navy.png"), EmailIconBlueBg, "Submitted On", submittedLabel, "", "", EmailSlateStrong));
        sb.Append("<td style=\"width:1px;background-color:" + EmailBorderColor + ";font-size:0;line-height:0;\">&nbsp;</td>");
        sb.Append(MetaCard(Icon("icon-clock-orange.png"), EmailIconAmberBg, "Status", statusValueText, statusSubText, pendingSub, EmailAmberColor));
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("<tr><td style=\"background-color:#ffffff;border-bottom:1px solid " + EmailBorderColor + ";padding:0;\">");
        sb.Append("<table role=\"presentation\" class=\"mobile-only\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\">");
        sb.Append(MobileMetaRow(Icon("icon-document-navy.png"), EmailIconBlueBg, "PR Number", Enc(prLabel), "", "", EmailSlateStrong, true));
        sb.Append(MobileMetaRow(Icon("icon-calendar-navy.png"), EmailIconBlueBg, "Submitted On", submittedLabel, "", "", EmailSlateStrong, true));
        sb.Append(MobileMetaRow(Icon("icon-clock-orange.png"), EmailIconAmberBg, "Status", statusValueText, statusSubText, pendingSub, EmailAmberColor, false));
        sb.Append("</table>");
        sb.Append("</td></tr>");

        // ===== TITLE + REVISION + SUBMITTED-BY/DEPARTMENT/VENDOR LINE =====
        var titleBadgeText = isFinanceMode
            ? "All Approvals Complete &middot; Finance Action Required"
            : "Approval Requested &middot; Stage " + step!.StepOrder + " of " + record.RequiredApprovalStageCount;
        sb.Append("<tr><td style=\"padding:26px 28px 0;\" class=\"px-mobile\">");
        sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.06em;color:" + EmailBrandColor + ";text-transform:uppercase;margin-bottom:8px;\">" + titleBadgeText + "</div>");
        sb.Append("<h1 style=\"margin:0 0 8px;font-size:23px;line-height:1.35;color:" + EmailSlateStrong + ";font-family:" + EmailFontStack + ";\">");
        sb.Append(Enc(prLabel) + " &mdash; " + Enc(record.Title));
        if (isRevision)
        {
            sb.Append("<span style=\"display:inline-block;margin-left:6px;padding:2px 8px;font-size:11.5px;font-weight:700;color:" + EmailBrandColor + ";background-color:#EFF6FF;border-radius:20px;vertical-align:middle;\">Rev " + record.RevisionNumber.ToString("00") + "</span>");
        }
        sb.Append("</h1>");

        // A revision only ever comes from an already-APPROVED PR
        // (CreateRevisionAsync enforces that), never a rejected one - so
        // this deliberately never says "rejected".
        if (isRevision && !string.IsNullOrWhiteSpace(previousPrLabel))
        {
            sb.Append("<p style=\"margin:0 0 4px;font-size:13px;line-height:1.5;color:" + EmailMutedText + ";\">");
            sb.Append("This is a revision of the previously approved <a href=\"" + reviewLink + "\" style=\"color:" + EmailBrandColor + ";text-decoration:none;font-weight:600;\">" + Enc(previousPrLabel) + "</a> &mdash; see what changed in the portal.");
            sb.Append("</p>");
        }

        var metaLineParts = new List<string>
        {
            "Submitted by: <strong style=\"color:" + EmailSlateStrong + ";\">" + Enc(requesterName) + "</strong>" +
                (string.IsNullOrWhiteSpace(employeeCode) ? "" : " (" + Enc(employeeCode) + ")")
        };
        if (!string.IsNullOrWhiteSpace(departmentName))
            metaLineParts.Add("Department: <strong style=\"color:" + EmailSlateStrong + ";\">" + Enc(departmentName) + "</strong>");
        if (!string.IsNullOrWhiteSpace(vendorName))
            metaLineParts.Add("Vendor: <strong style=\"color:" + EmailSlateStrong + ";\">" + Enc(vendorName) + "</strong>");
        sb.Append("<p style=\"margin:8px 0 0;font-size:13.5px;color:" + EmailMutedText + ";\">" + string.Join(" &middot; ", metaLineParts) + "</p>");
        sb.Append("</td></tr>");

        // ===== REQUESTED BY / ENTITY (icon rows) =====
        sb.Append("<tr><td style=\"padding:18px 28px 0;\" class=\"px-mobile\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-top:1px solid " + EmailBorderColor + ";padding-top:18px;\"><tr>");
        sb.Append(ContextRow(Icon("icon-person-navy.png"), EmailIconBlueBg, "Requested By",
            Enc(requesterName) + (string.IsNullOrWhiteSpace(employeeCode) ? "" : " <span style=\"color:" + EmailFaintText + ";font-weight:400;\">(" + Enc(employeeCode) + ")</span>")));
        sb.Append(ContextRow(Icon("icon-building-navy.png"), EmailIconBlueBg, "Entity",
            (string.IsNullOrWhiteSpace(companyName) ? "Not Specified" : Enc(companyName)) +
            (string.IsNullOrWhiteSpace(gstin) ? "" : "<br/><span style=\"font-size:11px;color:" + EmailFaintText + ";font-weight:400;\">GSTIN: " + Enc(gstin) + "</span>")));
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        // ===== BUSINESS JUSTIFICATION / SUPPORTING DOCUMENTS (two columns) =====
        sb.Append("<tr><td style=\"padding:20px 28px 0;\" class=\"px-mobile\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border-top:1px solid " + EmailBorderColor + ";padding-top:20px;\"><tr>");

        sb.Append("<td class=\"stack-col stack-col-a\" width=\"50%\" valign=\"top\" style=\"padding-right:14px;\">");
        sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:" + EmailSlateStrong + ";text-transform:uppercase;margin-bottom:10px;border-left:3px solid " + EmailBrandColor + ";padding-left:8px;\">Business Justification</div>");
        sb.Append("<div style=\"font-size:13px;color:" + EmailSlateText + ";line-height:1.6;\">" + (string.IsNullOrWhiteSpace(record.Justification) ? "Not specified." : Enc(record.Justification)) + "</div>");
        sb.Append("</td>");

        sb.Append("<td class=\"stack-col stack-col-b\" width=\"50%\" valign=\"top\" style=\"padding-left:14px;padding-top:0;\">");
        sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:" + EmailSlateStrong + ";text-transform:uppercase;margin-bottom:10px;border-left:3px solid " + EmailBrandColor + ";padding-left:8px;\">Supporting Documents (" + attachmentsOrdered.Count + ")</div>");
        if (attachmentsOrdered.Count == 0)
        {
            sb.Append("<div style=\"font-size:13px;color:" + EmailMutedText + ";\">No supporting documents attached.</div>");
        }
        else
        {
            foreach (var a in shownAttachments)
            {
                var docUrl = publicApiBaseUrl + a.StoredPath;
                sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin-bottom:12px;\"><tr>");
                sb.Append("<td style=\"width:22px;\" valign=\"top\"><img src=\"" + Icon("icon-document-blue.png") + "\" width=\"16\" height=\"16\" alt=\"\" style=\"display:block;margin-top:2px;width:16px;height:16px;\" /></td>");
                sb.Append("<td valign=\"top\">");
                sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:13px;font-weight:700;color:" + EmailSlateStrong + ";line-height:1.4;\">" + Enc(a.FileName) + "</div>");
                sb.Append("<div style=\"font-family:" + EmailFontStack + ";font-size:11.5px;color:" + EmailMutedText + ";margin-top:1px;\">" + Enc(FriendlyAttachmentType(a.AttachmentType)) + " &nbsp;&middot;&nbsp; " + AttachmentFormatLabel(a.FileName) + " &nbsp;&middot;&nbsp; <a href=\"" + docUrl + "\" style=\"color:" + EmailBrandColor + ";font-weight:600;text-decoration:none;\">View</a></div>");
                sb.Append("</td></tr></table>");
            }
            if (remainingAttachmentCount > 0)
            {
                sb.Append("<p style=\"margin:0 0 8px;font-family:" + EmailFontStack + ";font-size:12px;color:" + EmailMutedText + ";\">+" + remainingAttachmentCount + " more attached.</p>");
            }
            sb.Append("<a href=\"" + reviewLink + "\" style=\"font-family:" + EmailFontStack + ";font-size:12.5px;color:" + EmailBrandColor + ";font-weight:600;text-decoration:none;\">View all documents &#8594;</a>");
        }
        sb.Append("</td>");

        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        // ===== LINE ITEMS TABLE ===== straight from LineItems - never
        // recomputed here, only displayed, matching every other
        // line-item render in this module.
        var lineItems = record.LineItems.OrderBy(li => li.LineNumber).ToList();
        if (lineItems.Count > 0)
        {
            sb.Append("<tr><td style=\"padding:26px 28px 0;\" class=\"px-mobile\">");
            sb.Append("<div style=\"font-size:11.5px;font-weight:700;letter-spacing:0.04em;color:" + EmailSlateStrong + ";text-transform:uppercase;margin-bottom:10px;\">Item / Service Details</div>");

            sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border:1px solid " + EmailBorderColor + ";\">");
            sb.Append("<tr>");
            sb.Append("<td style=\"background-color:" + EmailHeaderNavy + ";padding:10px;text-align:center;border-right:1px solid " + EmailHeaderBorderNavy + ";\"><span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.03em;\">#</span></td>");
            sb.Append("<td style=\"background-color:" + EmailHeaderNavy + ";padding:10px 14px;border-right:1px solid " + EmailHeaderBorderNavy + ";\"><span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.03em;\">Item / Service Description</span></td>");
            sb.Append("<td style=\"background-color:" + EmailHeaderNavy + ";padding:10px 8px;text-align:center;border-right:1px solid " + EmailHeaderBorderNavy + ";\"><span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.03em;\">Qty</span></td>");
            sb.Append("<td style=\"background-color:" + EmailHeaderNavy + ";padding:10px 8px;text-align:center;border-right:1px solid " + EmailHeaderBorderNavy + ";\"><span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.03em;\">Unit Price (" + Enc(record.Currency) + ")</span></td>");
            sb.Append("<td style=\"background-color:" + EmailHeaderNavy + ";padding:10px 14px;text-align:right;\"><span style=\"font-family:" + EmailFontStack + ";font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.03em;\">Line Total (" + Enc(record.Currency) + ")</span></td>");
            sb.Append("</tr>");

            for (var i = 0; i < lineItems.Count; i++)
            {
                var li = lineItems[i];
                var rowBorder = i == lineItems.Count - 1 ? "" : "border-bottom:1px solid " + EmailBorderColor + ";";

                sb.Append("<tr>");
                sb.Append("<td style=\"padding:11px 10px;" + rowBorder + "border-right:1px solid " + EmailBorderColor + ";font-size:13px;color:" + EmailMutedText + ";text-align:center;\">" + (i + 1) + "</td>");
                sb.Append("<td style=\"padding:11px 14px;" + rowBorder + "border-right:1px solid " + EmailBorderColor + ";font-size:13px;color:" + EmailSlateStrong + ";\">" + Enc(li.ItemDescription) + "</td>");
                sb.Append("<td style=\"padding:11px 8px;" + rowBorder + "border-right:1px solid " + EmailBorderColor + ";font-size:13px;color:" + EmailSlateText + ";text-align:center;\">" + li.Quantity.ToString("0.##") + "</td>");
                sb.Append("<td style=\"padding:11px 8px;" + rowBorder + "border-right:1px solid " + EmailBorderColor + ";font-size:13px;color:" + EmailSlateText + ";text-align:center;\">" + li.UnitPrice.ToString("N2") + "</td>");
                sb.Append("<td style=\"padding:11px 14px;" + rowBorder + "font-size:13px;color:" + EmailSlateStrong + ";font-weight:700;text-align:right;\">" + li.LineTotal.ToString("N2") + "</td>");
                sb.Append("</tr>");
            }

            sb.Append("</table>");

            // ===== TAX BREAKDOWN + GRAND TOTAL ===== tax is stored at the
            // PR level (CgstPercent/SgstPercent/TaxAmount), never per line
            // item - this reflects that real structure rather than
            // inventing a per-line split the schema doesn't have.
            sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"margin:14px 0 0;\"><tr>");
            sb.Append("<td class=\"stack-col\" style=\"width:48%;\">&nbsp;</td>");
            sb.Append("<td class=\"stack-col\" style=\"width:100%;\">");
            sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"border:1px solid " + EmailBorderColor + ";\">");
            sb.Append("<tr><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailMutedText + ";\">Subtotal</td><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailSlateText + ";text-align:right;\">" + Enc(record.Currency) + " " + record.SubtotalAmount.ToString("N2") + "</td></tr>");
            sb.Append("<tr><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailMutedText + ";border-top:1px solid " + EmailBorderColor + ";\">CGST (" + record.CgstPercent.ToString("0.##") + "%)</td><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailSlateText + ";text-align:right;border-top:1px solid " + EmailBorderColor + ";\">" + Enc(record.Currency) + " " + (record.SubtotalAmount * record.CgstPercent / 100m).ToString("N2") + "</td></tr>");
            sb.Append("<tr><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailMutedText + ";border-top:1px solid " + EmailBorderColor + ";\">SGST (" + record.SgstPercent.ToString("0.##") + "%)</td><td style=\"padding:9px 14px;font-size:12.5px;color:" + EmailSlateText + ";text-align:right;border-top:1px solid " + EmailBorderColor + ";\">" + Enc(record.Currency) + " " + (record.SubtotalAmount * record.SgstPercent / 100m).ToString("N2") + "</td></tr>");
            sb.Append("<tr><td style=\"padding:13px 14px;font-size:14px;font-weight:700;color:" + EmailSlateStrong + ";border-top:2px solid " + EmailSlateStrong + ";\">Grand Total</td><td style=\"padding:13px 14px;font-size:17px;font-weight:700;color:" + EmailSlateStrong + ";text-align:right;border-top:2px solid " + EmailSlateStrong + ";\">" + Enc(record.Currency) + " " + record.TotalAmount.ToString("N2") + "</td></tr>");
            sb.Append("</table>");
            sb.Append("</td>");
            sb.Append("</tr></table>");
            sb.Append("</td></tr>");
        }

        // ===== PRIMARY CTA ===== a single "Review & Approve" button
        // linking to the plain review link (no ?action= bias) - the
        // decision itself is only ever recorded on the portal landing
        // page after an explicit confirming click there (see method
        // comment above), so a neutral link avoids visually steering the
        // reader toward Approve before they've reviewed anything.
        sb.Append("<tr><td style=\"padding:26px 28px 0;\" class=\"px-mobile\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\" style=\"background-color:" + EmailIconBlueBg + ";border:1px solid #DCE7FA;\"><tr>");
        sb.Append("<td align=\"center\" style=\"padding:22px 24px;\">");
        sb.Append("<img src=\"" + Icon("icon-shield-blue.png") + "\" width=\"16\" height=\"16\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:16px;height:16px;margin-right:6px;\" /><span style=\"font-family:" + EmailFontStack + ";font-size:14px;font-weight:700;color:" + EmailBrandColor + ";vertical-align:middle;letter-spacing:0.02em;\">" + ctaBadgeText + "</span>");
        sb.Append("<p style=\"margin:8px 0 18px;font-size:13px;color:" + EmailSlateText + ";\">" + ctaBodyText + "</p>");

        sb.Append("<!--[if mso]>");
        sb.Append("<v:roundrect xmlns:v=\"urn:schemas-microsoft-com:vml\" href=\"" + reviewLink + "\" style=\"height:46px;v-text-anchor:middle;width:320px;\" arcsize=\"12%\" stroke=\"f\" fillcolor=\"" + EmailBrandColor + "\">");
        sb.Append("<center style=\"color:#ffffff;font-family:" + EmailFontStack + ";font-size:16px;font-weight:bold;\">" + ctaButtonLabel + " &#8594;</center>");
        sb.Append("</v:roundrect>");
        sb.Append("<![endif]-->");
        sb.Append("<!--[if !mso]><!-- -->");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td align=\"center\" style=\"border-radius:6px;background-color:" + EmailBrandColor + ";\">");
        sb.Append("<a href=\"" + reviewLink + "\" style=\"display:inline-block;width:100%;max-width:400px;padding:15px 32px;font-family:" + EmailFontStack + ";font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:6px;box-sizing:border-box;text-align:center;letter-spacing:0.02em;\">" + ctaButtonLabel + " &#8594;</a>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("<!--<![endif]-->");

        sb.Append("<p style=\"margin:16px 0 0;font-size:12px;line-height:1.6;color:" + EmailMutedText + ";\">" + ctaFooterText + "</p>");
        sb.Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        // ===== APPROVAL WORKFLOW ===== responsive horizontal/vertical
        // stepper (see BuildApprovalWorkflowHorizontalHtml's comment).
        // step?.Id is null in Finance mode - nothing needs highlighting
        // there since every approval step is already Approved (green tick)
        // and the Finance circle itself already renders amber/"current" on
        // its own, per that method's existing status logic.
        sb.Append(BuildApprovalWorkflowHorizontalHtml(record, allSteps, step?.Id));

        // ===== FOOTER =====
        sb.Append("<tr><td style=\"padding:14px 28px;background-color:" + EmailPanelBg + ";border-top:1px solid " + EmailBorderColor + ";\" class=\"px-mobile\">");
        sb.Append("<p style=\"margin:0;font-size:11.5px;color:" + EmailMutedText + ";line-height:1.6;text-align:center;font-family:" + EmailFontStack + ";\">");
        sb.Append("<img src=\"" + Icon("icon-lock-navy.png") + "\" width=\"11\" height=\"11\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:11px;height:11px;margin-right:4px;\" />Secure link expires <strong style=\"color:" + EmailSlateStrong + ";\">" + tokenExpiresAt.ToString("dd MMM yyyy") + "</strong> and can only be used once. &nbsp;|&nbsp; Please do not forward this email.");
        sb.Append("</p>");
        sb.Append("</td></tr>");
        sb.Append("<tr><td style=\"padding:14px 28px;background-color:" + EmailHeaderNavy + ";\" class=\"px-mobile\">");
        sb.Append("<table role=\"presentation\" width=\"100%\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>");
        sb.Append("<td style=\"font-family:" + EmailFontStack + ";font-size:11px;color:" + EmailFooterMutedText + ";\">PPS SmartAsset &middot; Automated Notification</td>");
        sb.Append("<td align=\"right\" style=\"font-family:" + EmailFontStack + ";font-size:11px;color:" + EmailFooterMutedText + ";\">Please do not reply to this email.</td>");
        sb.Append("</tr></table>");
        sb.Append("</td></tr>");

        sb.Append("</table>");
        sb.Append("<!--[if mso]></td></tr></table><![endif]-->");
        sb.Append("</td></tr>");
        sb.Append("</table>");
        sb.Append("</body></html>");

        return sb.ToString();

        // Local helpers for the two icon-led metadata/context row shapes
        // used above (desktop metadata card, mobile metadata row, and the
        // Requested By/Entity context row) - kept local since they close
        // over EmailFontStack/color constants and aren't needed elsewhere.
        static string MetaCard(string iconUrl, string bg, string label, string value, string sub, string pendingHtml, string valueColor)
        {
            var subHtml = string.IsNullOrEmpty(sub)
                ? ""
                : "<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:" + EmailSlateText + ";margin-top:1px;\">" + sub + "</div>";
            return "<td style=\"padding:14px 10px;\" align=\"center\" valign=\"top\">" +
                "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
                "<td style=\"width:34px;height:34px;border-radius:17px;background-color:" + bg + ";text-align:center;vertical-align:middle;\" valign=\"middle\">" +
                "<img src=\"" + iconUrl + "\" width=\"17\" height=\"17\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:17px;height:17px;\" />" +
                "</td>" +
                "<td style=\"padding-left:8px;\" valign=\"middle\" align=\"left\">" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:9.5px;color:" + EmailFaintText + ";text-transform:uppercase;letter-spacing:0.05em;\">" + label + "</div>" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:13px;color:" + valueColor + ";font-weight:700;margin-top:1px;\">" + value + "</div>" +
                subHtml + pendingHtml +
                "</td></tr></table></td>";
        }

        static string MobileMetaRow(string iconUrl, string bg, string label, string value, string sub, string pendingHtml, string valueColor, bool border)
        {
            var subHtml = string.IsNullOrEmpty(sub)
                ? ""
                : "<div style=\"font-family:" + EmailFontStack + ";font-size:11.5px;color:" + EmailSlateText + ";margin-top:2px;\">" + sub + "</div>";
            var borderStyle = border ? "border-bottom:1px solid " + EmailBorderColor + ";" : "";
            return "<tr><td style=\"padding:12px 20px;" + borderStyle + "\">" +
                "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
                "<td style=\"width:32px;height:32px;border-radius:16px;background-color:" + bg + ";text-align:center;vertical-align:middle;\" valign=\"middle\">" +
                "<img src=\"" + iconUrl + "\" width=\"16\" height=\"16\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:16px;height:16px;\" />" +
                "</td>" +
                "<td style=\"padding-left:10px;\" valign=\"middle\" align=\"left\">" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:10.5px;color:" + EmailFaintText + ";text-transform:uppercase;letter-spacing:0.05em;\">" + label + "</div>" +
                "<div style=\"font-family:" + EmailFontStack + ";font-size:13.5px;color:" + valueColor + ";font-weight:700;margin-top:1px;\">" + value + "</div>" +
                subHtml + pendingHtml +
                "</td></tr></table></td></tr>";
        }

        static string ContextRow(string iconUrl, string bg, string label, string valueHtml) =>
            "<td class=\"stack-col\" style=\"padding:14px 18px;\" valign=\"top\" width=\"50%\">" +
            "<table role=\"presentation\" cellpadding=\"0\" cellspacing=\"0\" border=\"0\"><tr>" +
            "<td style=\"width:38px;height:38px;border-radius:19px;background-color:" + bg + ";text-align:center;vertical-align:middle;\" valign=\"middle\">" +
            "<img src=\"" + iconUrl + "\" width=\"18\" height=\"18\" alt=\"\" style=\"display:inline-block;vertical-align:middle;width:18px;height:18px;\" />" +
            "</td>" +
            "<td style=\"padding-left:10px;\" valign=\"middle\" align=\"left\">" +
            "<div style=\"font-family:" + EmailFontStack + ";font-size:11px;color:" + EmailMutedText + ";text-transform:uppercase;letter-spacing:0.04em;\">" + label + "</div>" +
            "<div style=\"font-family:" + EmailFontStack + ";font-size:13.5px;color:" + EmailSlateStrong + ";font-weight:600;margin-top:2px;\">" + valueHtml + "</div>" +
            "</td></tr></table></td>";
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
            sb.Append(BuildApprovalStepperHtml(record, allSteps, null));
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
            // Kept as a separate non-nullable local (rather than reading
            // notification.ExpiresAt back out below) because that property
            // is a nullable DateTime? column - BuildFinanceNotificationEmailHtml
            // needs a plain DateTime, same as the approver email builder.
            var tokenExpiresAt = DateTime.UtcNow.AddDays(FinanceTokenValidityDays);
            notification.ExpiresAt = tokenExpiresAt;

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

            var subject =
                $"Purchase Requisition Approved — {prLabel}: verify and issue PO " +
                $"({record.Currency} {record.TotalAmount:N2})";

            // Same allSteps shape IssueTokenAndSendApprovalRequestEmailAsync
            // builds for the approver email - record.ApprovalSteps is
            // already loaded (DecideStepCoreAsync reads it a few lines
            // before calling this method), so this is no extra query.
            var allSteps = record.ApprovalSteps
                .OrderBy(s => s.StepOrder)
                .ToList();

            var body = BuildFinanceNotificationEmailHtml(
                record, allSteps, link, tokenExpiresAt, _publicApiBaseUrl);

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
            PoDate = record.PoDate,
            PoAmount = record.PoAmount,
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
     * PoNumber/PoDate/PoAmount/PoDocumentPath/PoUploadedAt and re-sends
     * the "PO ready" email to the requester with the latest file, rather
     * than being rejected as already-consumed (see TokenHash's comment).
     * Before each overwrite, a PurchaseRequisitionPoUpload row captures
     * exactly what's being replaced, so a correction never erases the
     * paper trail (Phase 6) - the header still always reflects "the
     * current PO," matching every existing caller's expectation.
     *
     * PoUploadedByUserId is left null - Finance isn't a User in this
     * app (same reasoning as PurchaseRequisitionFinanceNotification's
     * email-only addressing) - the audit log entry, and now
     * PoUploadedByEmail on the record itself, capture which Finance
     * address performed the upload instead.
     */
    public async Task<PublicPurchaseRequisitionFinanceResponse?> UploadPoByTokenAsync(
        string rawToken,
        IFormFile file,
        string? poNumber,
        DateTime? poDate,
        decimal? poAmount,
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

        // Whether this is Finance's first upload for this PR, or a
        // revision of one already on file - decided before the header is
        // touched below, so the distinction is based on what was actually
        // there a moment ago.
        var isRevision = !string.IsNullOrWhiteSpace(record.PoDocumentPath);

        if (isRevision)
        {
            _context.PurchaseRequisitionPoUploads.Add(new Models.PurchaseRequisitionPoUpload
            {
                PurchaseRequisitionId = record.Id,
                PoNumber = record.PoNumber,
                PoDate = record.PoDate,
                PoAmount = record.PoAmount,
                PoDocumentPath = record.PoDocumentPath,
                UploadedAt = record.PoUploadedAt ?? record.UpdatedAt ?? record.CreatedAt,
                UploadedByEmail = record.PoUploadedByEmail
            });
        }

        record.PoNumber = trimmedPoNumber;
        record.PoDate = poDate;
        record.PoAmount = poAmount;
        record.PoDocumentPath =
            $"purchase-requisitions/{record.Id}/po/{generatedFileName}";
        record.PoUploadedAt = DateTime.UtcNow;
        record.PoUploadedByUserId = null;
        record.PoUploadedByEmail = notification.SentToEmail;
        record.UpdatedAt = DateTime.UtcNow;

        AddAuditLog(record.Id, isRevision ? "PoRevised" : "PoUploaded", null,
            $"PO document {(isRevision ? "revised" : "uploaded")} via the Finance link " +
            $"({notification.SentToEmail})." +
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

    /*
     * Finance's email for the fully-approved PR - per direct feedback,
     * this now reuses the exact same rich template every approver sees
     * (BuildApprovalRequestEmailHtml: header, metadata strip, requested-
     * by/entity, business justification, supporting documents - including
     * the vendor quotation files, already labelled "Vendor Quotation" by
     * FriendlyAttachmentType, so no separate quotation-only list is needed
     * - the full line-items + GST + Grand Total table, and the Approval
     * Workflow stepper) rather than the separate, much lighter template
     * (vendor/total summary strip only, no line-items table, no stepper)
     * this used to have. Only the CTA copy changes, since Finance's action
     * is "verify & upload PO copy" rather than "approve/reject". The full
     * PR PDF is still attached separately by the caller
     * (IssueFinanceTokenAndSendNotificationAsync), unrelated to this HTML.
     */
    private static string BuildFinanceNotificationEmailHtml(
        Models.PurchaseRequisition record,
        IReadOnlyList<PurchaseRequisitionApprovalStep> allSteps,
        string reviewLink,
        DateTime tokenExpiresAt,
        string publicApiBaseUrl)
    {
        return BuildApprovalRequestEmailHtml(
            record,
            step: null,
            allSteps,
            approverDisplayName: "Finance",
            reviewLink,
            tokenExpiresAt,
            publicApiBaseUrl,
            ctaBadgeText: "YOUR ACTION IS REQUIRED",
            ctaBodyText: "Please verify the request and the attached quotation, then issue the PO and upload a copy on the PPS SmartAsset portal.",
            ctaButtonLabel: "VERIFY & UPLOAD PO COPY",
            ctaFooterText: "This will redirect you to the PPS SmartAsset portal<br/>to verify and upload the PO copy securely.");
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

    /*
     * Same access rule as GetPoDocumentFileAsync, but for one specific
     * PurchaseRequisitionPoUpload history row instead of always "whatever
     * is current" - lets a user download an earlier PO copy after a later
     * revision has overwritten PurchaseRequisition.PoDocumentPath. The
     * file itself is never moved/deleted on revision (see
     * UploadPoByTokenAsync), so this just resolves a different, older
     * path than GetPoDocumentFileAsync does.
     */
    public async Task<(string PhysicalPath, string FileName)?> GetPoUploadHistoryDocumentAsync(
        int purchaseRequisitionId,
        int poUploadId,
        int requestingUserId,
        bool isPrivileged,
        string pdfStorageRootPath)
    {
        var record = await _context.PurchaseRequisitions
            .Include(x => x.ApprovalSteps)
            .FirstOrDefaultAsync(x => x.Id == purchaseRequisitionId);

        if (record == null)
            return null;

        var isOwner = record.RequestedByUserId == requestingUserId;
        var isAssignedApprover = record.ApprovalSteps
            .Any(s => s.AssignedApproverUserId == requestingUserId);

        if (!isOwner && !isPrivileged && !isAssignedApprover)
            throw new UnauthorizedAccessException(
                "You don't have access to this purchase requisition.");

        var upload = await _context.PurchaseRequisitionPoUploads
            .FirstOrDefaultAsync(x =>
                x.Id == poUploadId && x.PurchaseRequisitionId == purchaseRequisitionId);

        if (upload == null || string.IsNullOrWhiteSpace(upload.PoDocumentPath))
            return null;

        var physicalPath = Path.Combine(
            pdfStorageRootPath,
            upload.PoDocumentPath.Replace('/', Path.DirectorySeparatorChar));

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
