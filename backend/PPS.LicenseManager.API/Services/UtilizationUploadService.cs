using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using ClosedXML.Excel;
using CsvHelper;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Utilization;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;
using PPS.LicenseManager.API.Services.Utilization;

namespace PPS.LicenseManager.API.Services;

/*
 * Software License Utilization & Analytics module - upload, column
 * mapping, and processing pipeline. See UtilizationUploadBatch/
 * UtilizationRawRow/UtilizationFact for the data model this fills in.
 *
 * Follows the same validated-upload pattern as PurchaseRequisitionService
 * (extension whitelist, magic-byte/content check, GUID-named file under
 * the private App_Data tree, rollback-on-failure) and the same
 * in-memory-bulk-insert pattern as AssetAuditService (loop Add(), one
 * SaveChangesAsync per table) - both reused rather than reinvented.
 */
public class UtilizationUploadService : IUtilizationUploadService
{
    private static readonly string[] AllowedExtensions = { ".xlsx", ".csv" };
    private const long MaxFileSizeBytes = 20 * 1024 * 1024; // 20 MB

    private const string FlagMissingUsageData = "MissingUsageData";
    private const string FlagMissingUserIdentifier = "MissingUserIdentifier";
    private const string FlagUnmatchedUser = "UnmatchedUser";
    private const string FlagWeakUserMatch = "WeakUserMatch";
    private const string FlagUnmatchedSoftware = "UnmatchedSoftware";
    private const string FlagSoftwareMismatch = "SoftwareMismatch";
    private const string FlagDuplicateRow = "DuplicateRow";
    private const string FlagInvalidDate = "InvalidDate";

    private readonly ApplicationDbContext _context;

    public UtilizationUploadService(ApplicationDbContext context)
    {
        _context = context;
    }

    // =========================================================
    // LIST / READ
    // =========================================================

    public async Task<List<UtilizationUploadBatchResponse>> GetAllAsync()
    {
        var batches = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .Include(b => b.Software)
            .Include(b => b.Company)
            .Include(b => b.Department)
            .Include(b => b.UploadedByUser)
            .OrderByDescending(b => b.UploadedAt)
            .ToListAsync();

        return batches.Select(Map).ToList();
    }

    // =========================================================
    // UPLOAD
    // =========================================================

    public async Task<UtilizationUploadBatchResponse> UploadAsync(
        IFormFile file,
        UploadUtilizationBatchRequest request,
        int actorUserId,
        string storageRootPath)
    {
        if (file == null || file.Length == 0)
            throw new InvalidOperationException("No file was uploaded.");

        if (file.Length > MaxFileSizeBytes)
            throw new InvalidOperationException("The uploaded file must not exceed 20 MB.");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();

        if (!AllowedExtensions.Contains(extension))
            throw new InvalidOperationException(
                "Only .xlsx and .csv files are accepted.");

        if (string.IsNullOrWhiteSpace(request.VendorSourceName))
            throw new InvalidOperationException("A vendor/source name is required.");

        if (request.ReportingPeriodEnd < request.ReportingPeriodStart)
            throw new InvalidOperationException(
                "The reporting period end date cannot be before its start date.");

        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer);
        var fileBytes = buffer.ToArray();

        await ValidateFileContentAsync(fileBytes, extension);

        var fileHash = Convert.ToHexString(SHA256.HashData(fileBytes)).ToLowerInvariant();

        var existingActive = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .Include(b => b.Software)
            .Include(b => b.Company)
            .Include(b => b.Department)
            .Include(b => b.UploadedByUser)
            .FirstOrDefaultAsync(b => b.FileHash == fileHash && b.IsActive);

        if (existingActive != null && !request.ForceUpload)
        {
            var duplicateResponse = Map(existingActive);
            duplicateResponse.DuplicateOfBatchId = existingActive.Id;
            return duplicateResponse;
        }

        var (headers, rows) = ParseFile(fileBytes, extension);

        if (headers.Count == 0)
            throw new InvalidOperationException(
                "No column headers were found in the uploaded file.");

        var uploadDirectory = Path.Combine(storageRootPath, "utilization-uploads");
        Directory.CreateDirectory(uploadDirectory);

        var storedFileName = $"{Guid.NewGuid():N}{extension}";
        var destination = Path.Combine(uploadDirectory, storedFileName);
        await File.WriteAllBytesAsync(destination, fileBytes);

        var batch = new UtilizationUploadBatch
        {
            SoftwareId = request.SoftwareId,
            VendorSourceName = request.VendorSourceName.Trim(),
            MappingProfileId = request.MappingProfileId,
            OriginalFileName = file.FileName,
            StoredPath = Path.Combine("utilization-uploads", storedFileName),
            ContentType = file.ContentType,
            FileSizeBytes = fileBytes.LongLength,
            FileHash = fileHash,
            ReportingPeriodStart = request.ReportingPeriodStart,
            ReportingPeriodEnd = request.ReportingPeriodEnd,
            Status = "Uploaded",
            TotalRowCount = rows.Count,
            CompanyId = request.CompanyId,
            DepartmentId = request.DepartmentId,
            UploadedByUserId = actorUserId,
            UploadedAt = DateTime.UtcNow,
            IsActive = true,
        };

        _context.UtilizationUploadBatches.Add(batch);
        await _context.SaveChangesAsync();

        foreach (var row in rows)
        {
            var rowJson = JsonSerializer.Serialize(
                row.OrderBy(kv => kv.Key, StringComparer.Ordinal)
                    .ToDictionary(kv => kv.Key, kv => kv.Value));

            _context.UtilizationRawRows.Add(new UtilizationRawRow
            {
                UploadBatchId = batch.Id,
                RowNumber = rows.IndexOf(row) + 1,
                RawDataJson = JsonSerializer.Serialize(row),
                RowHash = Convert.ToHexString(
                    SHA256.HashData(Encoding.UTF8.GetBytes(rowJson))).ToLowerInvariant(),
            });
        }

        await _context.SaveChangesAsync();

        await AddAuditLogAsync(
            batch.Id,
            "Uploaded",
            actorUserId,
            $"{rows.Count} rows read from '{file.FileName}'.");

        var saved = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .Include(b => b.Software)
            .Include(b => b.Company)
            .Include(b => b.Department)
            .Include(b => b.UploadedByUser)
            .FirstAsync(b => b.Id == batch.Id);

        return Map(saved);
    }

    // =========================================================
    // PREVIEW / MAPPING
    // =========================================================

    public async Task<UtilizationUploadPreviewResponse> GetPreviewAsync(int batchId)
    {
        var batch = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Upload not found.");

        var firstRow = await _context.UtilizationRawRows
            .AsNoTracking()
            .Where(r => r.UploadBatchId == batchId)
            .OrderBy(r => r.RowNumber)
            .FirstOrDefaultAsync();

        var sourceColumns = firstRow == null
            ? new List<string>()
            : JsonSerializer.Deserialize<Dictionary<string, string?>>(firstRow.RawDataJson)!
                .Keys.ToList();

        var suggestionMap = UtilizationNormalizedFields.SuggestMapping(sourceColumns);

        var suggestions = UtilizationNormalizedFields.AllFields.Select(field =>
            new UtilizationColumnMappingSuggestion
            {
                NormalizedField = field,
                IsRequired = UtilizationNormalizedFields.RequiredFields.Contains(field),
                SuggestedSourceColumn = suggestionMap.GetValueOrDefault(field),
            }).ToList();

        var sampleRows = await _context.UtilizationRawRows
            .AsNoTracking()
            .Where(r => r.UploadBatchId == batchId)
            .OrderBy(r => r.RowNumber)
            .Take(8)
            .Select(r => r.RawDataJson)
            .ToListAsync();

        var fileFormat = DetectFileFormat(batch.OriginalFileName);

        var matchingProfile = await _context.UtilizationMappingProfiles
            .AsNoTracking()
            .Where(p => p.IsActive &&
                        p.FileFormat == fileFormat &&
                        p.VendorSourceName.ToLower() == batch.VendorSourceName.ToLower())
            .OrderByDescending(p => p.LastUsedAt ?? p.CreatedAt)
            .FirstOrDefaultAsync();

        return new UtilizationUploadPreviewResponse
        {
            BatchId = batchId,
            SourceColumns = sourceColumns,
            Suggestions = suggestions,
            SampleRows = sampleRows
                .Select(json => JsonSerializer.Deserialize<Dictionary<string, string?>>(json)!)
                .ToList(),
            TotalRowCount = batch.TotalRowCount,
            MatchingMappingProfileId = matchingProfile?.Id,
            MatchingMappingProfileName = matchingProfile?.Name,
        };
    }

    public async Task<UtilizationUploadBatchResponse> SaveMappingAsync(
        int batchId,
        SaveUtilizationMappingRequest request,
        int actorUserId)
    {
        var batch = await _context.UtilizationUploadBatches
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Upload not found.");

        var missingRequired = UtilizationNormalizedFields.RequiredFields
            .Where(f => !request.ColumnMappings.ContainsKey(f) ||
                        string.IsNullOrWhiteSpace(request.ColumnMappings[f]))
            .ToList();

        if (missingRequired.Count > 0)
            throw new InvalidOperationException(
                $"The following required fields must be mapped: {string.Join(", ", missingRequired)}.");

        batch.ConfirmedMappingJson = JsonSerializer.Serialize(request.ColumnMappings);
        batch.Status = "Mapped";

        if (!string.IsNullOrWhiteSpace(request.SaveAsProfileName))
        {
            var fileFormat = DetectFileFormat(batch.OriginalFileName);

            var profile = await _context.UtilizationMappingProfiles.FirstOrDefaultAsync(p =>
                p.VendorSourceName.ToLower() == batch.VendorSourceName.ToLower() &&
                p.FileFormat == fileFormat &&
                p.Name.ToLower() == request.SaveAsProfileName.Trim().ToLower());

            if (profile == null)
            {
                profile = new UtilizationMappingProfile
                {
                    Name = request.SaveAsProfileName.Trim(),
                    VendorSourceName = batch.VendorSourceName,
                    FileFormat = fileFormat,
                    SoftwareId = batch.SoftwareId,
                    CreatedByUserId = actorUserId,
                    CreatedAt = DateTime.UtcNow,
                };
                _context.UtilizationMappingProfiles.Add(profile);
            }

            profile.ColumnMappingsJson = batch.ConfirmedMappingJson;
            profile.LastUsedAt = DateTime.UtcNow;
            profile.IsActive = true;

            await _context.SaveChangesAsync();

            batch.MappingProfileId = profile.Id;
        }

        await _context.SaveChangesAsync();

        await AddAuditLogAsync(batch.Id, "MappingSaved", actorUserId, batch.ConfirmedMappingJson);

        var saved = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .Include(b => b.Software)
            .Include(b => b.Company)
            .Include(b => b.Department)
            .Include(b => b.UploadedByUser)
            .FirstAsync(b => b.Id == batchId);

        return Map(saved);
    }

    // =========================================================
    // PROCESS
    // =========================================================

    public async Task<UtilizationProcessResultResponse> ProcessAsync(int batchId, int actorUserId)
    {
        var batch = await _context.UtilizationUploadBatches
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Upload not found.");

        if (batch.Status != "Mapped" && batch.Status != "Processed")
            throw new InvalidOperationException(
                "This upload must have a confirmed column mapping before it can be processed.");

        if (string.IsNullOrWhiteSpace(batch.ConfirmedMappingJson))
            throw new InvalidOperationException("No column mapping has been confirmed for this upload.");

        var mapping = JsonSerializer.Deserialize<Dictionary<string, string>>(batch.ConfirmedMappingJson)!;

        // Reprocessing (e.g. after fixing the mapping) replaces every
        // previously-derived fact for this batch - the raw rows and the
        // uploaded file itself are never touched, only the derived facts.
        var existingFacts = _context.UtilizationFacts.Where(f => f.UploadBatchId == batchId);
        _context.UtilizationFacts.RemoveRange(existingFacts);
        await _context.SaveChangesAsync();

        var rawRows = await _context.UtilizationRawRows
            .AsNoTracking()
            .Where(r => r.UploadBatchId == batchId)
            .OrderBy(r => r.RowNumber)
            .ToListAsync();

        var softwareList = await _context.Software
            .AsNoTracking()
            .Where(s => s.IsActive)
            .ToListAsync();

        var userList = await _context.Users
            .AsNoTracking()
            .ToListAsync();

        var departmentList = await _context.Departments
            .AsNoTracking()
            .ToListAsync();

        var seenRowHashes = new HashSet<string>();

        var facts = new List<UtilizationFact>();
        int unusableCount = 0, warningCount = 0, duplicateCount = 0,
            unmatchedSoftwareCount = 0, unmatchedUserCount = 0;

        foreach (var raw in rawRows)
        {
            var rowData = JsonSerializer.Deserialize<Dictionary<string, string?>>(raw.RawDataJson)!;

            string? Get(string normalizedField) =>
                mapping.TryGetValue(normalizedField, out var col) && col != null &&
                rowData.TryGetValue(col, out var value)
                    ? value?.Trim()
                    : null;

            var flags = new List<string>();

            var rawUserIdentifier = Get(UtilizationNormalizedFields.RawUserIdentifier) ?? string.Empty;
            var rawSoftwareText = Get(UtilizationNormalizedFields.RawSoftwareText) ?? string.Empty;
            var rawUserDisplayName = Get(UtilizationNormalizedFields.RawUserDisplayName);
            var rawDepartmentText = Get(UtilizationNormalizedFields.RawDepartmentText);
            var rawLocationText = Get(UtilizationNormalizedFields.RawLocationText);
            var versionUsed = Get(UtilizationNormalizedFields.VersionUsed);
            var rawStatusText = Get(UtilizationNormalizedFields.RawStatusText);

            if (string.IsNullOrWhiteSpace(rawUserIdentifier))
                flags.Add(FlagMissingUserIdentifier);

            if (!seenRowHashes.Add(raw.RowHash))
            {
                flags.Add(FlagDuplicateRow);
                duplicateCount++;
            }

            DateOnly? lastUsedDate = null;
            var lastUsedRaw = Get(UtilizationNormalizedFields.LastUsedDate);
            if (!string.IsNullOrWhiteSpace(lastUsedRaw))
            {
                if (DateOnly.TryParse(lastUsedRaw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDate))
                    lastUsedDate = parsedDate;
                else if (DateTime.TryParse(lastUsedRaw, CultureInfo.InvariantCulture, DateTimeStyles.None, out var parsedDateTime))
                    lastUsedDate = DateOnly.FromDateTime(parsedDateTime);
                else
                    flags.Add(FlagInvalidDate);
            }

            int? daysUsed = null;
            var daysUsedRaw = Get(UtilizationNormalizedFields.DaysUsedInPeriod);
            if (!string.IsNullOrWhiteSpace(daysUsedRaw) &&
                int.TryParse(daysUsedRaw, NumberStyles.Integer, CultureInfo.InvariantCulture, out var parsedDays))
                daysUsed = parsedDays;

            decimal? monthlyAverage = null;
            var monthlyAverageRaw = Get(UtilizationNormalizedFields.MonthlyAverageUsage);
            if (!string.IsNullOrWhiteSpace(monthlyAverageRaw) &&
                decimal.TryParse(monthlyAverageRaw, NumberStyles.Number, CultureInfo.InvariantCulture, out var parsedAverage))
                monthlyAverage = parsedAverage;

            bool? assignedFlag = null;
            var assignedRaw = Get(UtilizationNormalizedFields.AssignedFlag)?.ToLowerInvariant();
            if (assignedRaw is "assigned" or "true" or "yes")
                assignedFlag = true;
            else if (assignedRaw is "unassigned" or "false" or "no" or "removed" or "revoked")
                assignedFlag = false;

            if (lastUsedDate == null && daysUsed == null)
            {
                flags.Add(FlagMissingUsageData);
            }

            // Software reconciliation - per row, since one batch commonly
            // covers many products (see UtilizationUploadBatch.SoftwareId's
            // comment). Case-insensitive/trimmed match only; never a
            // fuzzy/partial match, which would risk silently attributing
            // usage to the wrong catalog product.
            int? matchedSoftwareId = batch.SoftwareId;

            if (!string.IsNullOrWhiteSpace(rawSoftwareText))
            {
                var softwareMatch = softwareList.FirstOrDefault(s =>
                    string.Equals(s.Name.Trim(), rawSoftwareText.Trim(), StringComparison.OrdinalIgnoreCase));

                if (softwareMatch != null)
                {
                    if (matchedSoftwareId.HasValue && matchedSoftwareId != softwareMatch.Id)
                        flags.Add(FlagSoftwareMismatch);
                    else
                        matchedSoftwareId = softwareMatch.Id;
                }
                else if (!matchedSoftwareId.HasValue)
                {
                    flags.Add(FlagUnmatchedSoftware);
                    unmatchedSoftwareCount++;
                }
            }
            else if (!matchedSoftwareId.HasValue)
            {
                flags.Add(FlagUnmatchedSoftware);
                unmatchedSoftwareCount++;
            }

            // User reconciliation - email match first (unique, high
            // confidence), then a full-name fallback flagged as weak.
            User? matchedUser = null;

            if (!string.IsNullOrWhiteSpace(rawUserIdentifier))
            {
                matchedUser = userList.FirstOrDefault(u =>
                    string.Equals(u.Email.Trim(), rawUserIdentifier.Trim(), StringComparison.OrdinalIgnoreCase));

                if (matchedUser == null && !string.IsNullOrWhiteSpace(rawUserDisplayName))
                {
                    matchedUser = userList.FirstOrDefault(u =>
                        string.Equals(u.FullName.Trim(), rawUserDisplayName.Trim(), StringComparison.OrdinalIgnoreCase));

                    if (matchedUser != null)
                        flags.Add(FlagWeakUserMatch);
                }
            }

            if (matchedUser == null)
            {
                flags.Add(FlagUnmatchedUser);
                unmatchedUserCount++;
            }

            // Department: prefer the matched user's own (real FK)
            // DepartmentId - only fall back to fuzzy-matching the report's
            // own department/team text when there's no matched user to
            // anchor to.
            int? matchedDepartmentId = matchedUser?.DepartmentId;

            if (matchedDepartmentId == null && !string.IsNullOrWhiteSpace(rawDepartmentText))
            {
                var deptMatch = departmentList.FirstOrDefault(d =>
                    string.Equals(d.DepartmentName.Trim(), rawDepartmentText.Trim(), StringComparison.OrdinalIgnoreCase));

                matchedDepartmentId = deptMatch?.Id;
            }

            var isUsable = !flags.Contains(FlagMissingUsageData) &&
                           !flags.Contains(FlagMissingUserIdentifier);

            if (!isUsable) unusableCount++;
            if (flags.Count > 0) warningCount++;

            facts.Add(new UtilizationFact
            {
                UploadBatchId = batchId,
                RawRowId = raw.Id,
                SoftwareId = matchedSoftwareId,
                RawSoftwareText = rawSoftwareText,
                MatchedUserId = matchedUser?.Id,
                RawUserIdentifier = rawUserIdentifier,
                RawUserDisplayName = rawUserDisplayName,
                RawDepartmentText = rawDepartmentText,
                MatchedDepartmentId = matchedDepartmentId,
                RawLocationText = rawLocationText,
                LastUsedDate = lastUsedDate,
                DaysUsedInPeriod = daysUsed,
                MonthlyAverageUsage = monthlyAverage,
                VersionUsed = versionUsed,
                AssignedFlag = assignedFlag,
                RawStatusText = rawStatusText,
                DataQualityFlags = flags.Count > 0 ? string.Join(",", flags) : null,
                IsUsableForCalculation = isUsable,
                CreatedAt = DateTime.UtcNow,
            });
        }

        _context.UtilizationFacts.AddRange(facts);

        batch.TotalRowCount = rawRows.Count;
        batch.UsableRowCount = facts.Count(f => f.IsUsableForCalculation);
        batch.WarningRowCount = warningCount;
        batch.Status = "Processed";
        batch.ProcessedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        await AddAuditLogAsync(
            batchId,
            "Processed",
            actorUserId,
            $"{facts.Count} facts derived ({batch.UsableRowCount} usable, {warningCount} with warnings, " +
            $"{duplicateCount} duplicate rows, {unmatchedSoftwareCount} unmatched software, {unmatchedUserCount} unmatched users).");

        return new UtilizationProcessResultResponse
        {
            BatchId = batchId,
            TotalRowCount = rawRows.Count,
            UsableRowCount = batch.UsableRowCount,
            WarningRowCount = warningCount,
            UnusableRowCount = unusableCount,
            DuplicateRowCount = duplicateCount,
            UnmatchedSoftwareCount = unmatchedSoftwareCount,
            UnmatchedUserCount = unmatchedUserCount,
            Status = batch.Status,
        };
    }

    // =========================================================
    // FILE DOWNLOAD / DEACTIVATE / PROFILES
    // =========================================================

    public async Task<(Stream Stream, string ContentType, string FileName)> GetFileAsync(
        int batchId, string storageRootPath)
    {
        var batch = await _context.UtilizationUploadBatches
            .AsNoTracking()
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Upload not found.");

        var physicalPath = Path.Combine(storageRootPath, batch.StoredPath);

        if (!File.Exists(physicalPath))
            throw new InvalidOperationException("The original uploaded file is no longer available on disk.");

        var stream = File.OpenRead(physicalPath);
        return (stream, batch.ContentType, batch.OriginalFileName);
    }

    public async Task DeactivateAsync(int batchId, int actorUserId)
    {
        var batch = await _context.UtilizationUploadBatches
            .FirstOrDefaultAsync(b => b.Id == batchId)
            ?? throw new InvalidOperationException("Upload not found.");

        batch.IsActive = false;
        await _context.SaveChangesAsync();

        await AddAuditLogAsync(batchId, "Deactivated", actorUserId, null);
    }

    public async Task<List<UtilizationMappingProfileResponse>> GetMappingProfilesAsync()
    {
        var profiles = await _context.UtilizationMappingProfiles
            .AsNoTracking()
            .Include(p => p.Software)
            .Where(p => p.IsActive)
            .OrderByDescending(p => p.LastUsedAt ?? p.CreatedAt)
            .ToListAsync();

        return profiles.Select(p => new UtilizationMappingProfileResponse
        {
            Id = p.Id,
            Name = p.Name,
            VendorSourceName = p.VendorSourceName,
            FileFormat = p.FileFormat,
            ColumnMappings = JsonSerializer.Deserialize<Dictionary<string, string>>(p.ColumnMappingsJson)
                ?? new Dictionary<string, string>(),
            SoftwareId = p.SoftwareId,
            SoftwareName = p.Software?.Name,
            CreatedAt = p.CreatedAt,
            LastUsedAt = p.LastUsedAt,
        }).ToList();
    }

    // =========================================================
    // Helpers
    // =========================================================

    private static string DetectFileFormat(string fileName)
    {
        return Path.GetExtension(fileName).ToLowerInvariant() == ".csv" ? "Csv" : "Excel";
    }

    private static async Task ValidateFileContentAsync(byte[] fileBytes, string extension)
    {
        if (extension == ".xlsx")
        {
            // .xlsx is OOXML (zip-based) - a PK\x03\x04 signature confirms
            // a valid zip container, the same level of verification
            // PurchaseRequisitionService applies to .docx/.xlsx attachments.
            if (fileBytes.Length < 4 ||
                fileBytes[0] != 0x50 || fileBytes[1] != 0x4B ||
                fileBytes[2] != 0x03 || fileBytes[3] != 0x04)
                throw new InvalidOperationException(
                    "The file extension does not match the file's actual format.");
        }
        else
        {
            // .csv has no magic-byte signature - validate by content
            // instead: the bytes must decode as UTF-8 text (rejecting
            // binary/garbage content relabeled as .csv).
            try
            {
                var decoder = Encoding.GetEncoding(
                    "utf-8",
                    EncoderFallback.ExceptionFallback,
                    DecoderFallback.ExceptionFallback);

                decoder.GetString(fileBytes);
            }
            catch (DecoderFallbackException)
            {
                throw new InvalidOperationException(
                    "The uploaded .csv file is not valid UTF-8 text.");
            }
        }

        await Task.CompletedTask;
    }

    private static (List<string> Headers, List<Dictionary<string, string?>> Rows) ParseFile(
        byte[] fileBytes, string extension)
    {
        using var stream = new MemoryStream(fileBytes);

        return extension == ".csv" ? ParseCsv(stream) : ParseExcel(stream);
    }

    private static (List<string> Headers, List<Dictionary<string, string?>> Rows) ParseExcel(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var worksheet = workbook.Worksheets.First();

        var lastColumn = worksheet.LastColumnUsed()?.ColumnNumber() ?? 0;
        var lastRow = worksheet.LastRowUsed()?.RowNumber() ?? 1;

        var headers = new List<string>();
        for (var c = 1; c <= lastColumn; c++)
        {
            var text = worksheet.Cell(1, c).GetString().Trim();
            headers.Add(string.IsNullOrEmpty(text) ? $"Column{c}" : text);
        }

        var rows = new List<Dictionary<string, string?>>();

        for (var r = 2; r <= lastRow; r++)
        {
            var rowDict = new Dictionary<string, string?>();
            var anyValue = false;

            for (var c = 1; c <= headers.Count; c++)
            {
                var cell = worksheet.Cell(r, c);
                var text = cell.IsEmpty() ? null : cell.GetString().Trim();

                if (!string.IsNullOrEmpty(text)) anyValue = true;

                rowDict[headers[c - 1]] = string.IsNullOrEmpty(text) ? null : text;
            }

            if (anyValue) rows.Add(rowDict);
        }

        return (headers, rows);
    }

    private static (List<string> Headers, List<Dictionary<string, string?>> Rows) ParseCsv(Stream stream)
    {
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        using var csv = new CsvReader(reader, CultureInfo.InvariantCulture);

        csv.Read();
        csv.ReadHeader();
        var headers = (csv.HeaderRecord ?? Array.Empty<string>())
            .Select(h => h.Trim())
            .ToList();

        var rows = new List<Dictionary<string, string?>>();

        while (csv.Read())
        {
            var rowDict = new Dictionary<string, string?>();
            var anyValue = false;

            foreach (var header in headers)
            {
                var text = csv.GetField(header)?.Trim();

                if (!string.IsNullOrEmpty(text)) anyValue = true;

                rowDict[header] = string.IsNullOrEmpty(text) ? null : text;
            }

            if (anyValue) rows.Add(rowDict);
        }

        return (headers, rows);
    }

    private async Task AddAuditLogAsync(
        int? uploadBatchId, string action, int? performedByUserId, string? details)
    {
        _context.UtilizationUploadAuditLogs.Add(new UtilizationUploadAuditLog
        {
            UploadBatchId = uploadBatchId,
            Action = action,
            PerformedByUserId = performedByUserId,
            Details = details,
            CreatedAt = DateTime.UtcNow,
        });

        await _context.SaveChangesAsync();
    }

    private static UtilizationUploadBatchResponse Map(UtilizationUploadBatch b)
    {
        return new UtilizationUploadBatchResponse
        {
            Id = b.Id,
            SoftwareId = b.SoftwareId,
            SoftwareName = b.Software?.Name,
            VendorSourceName = b.VendorSourceName,
            OriginalFileName = b.OriginalFileName,
            FileSizeBytes = b.FileSizeBytes,
            ReportingPeriodStart = b.ReportingPeriodStart,
            ReportingPeriodEnd = b.ReportingPeriodEnd,
            Status = b.Status,
            TotalRowCount = b.TotalRowCount,
            UsableRowCount = b.UsableRowCount,
            WarningRowCount = b.WarningRowCount,
            CompanyId = b.CompanyId,
            CompanyName = b.Company?.Name,
            DepartmentId = b.DepartmentId,
            DepartmentName = b.Department?.DepartmentName,
            UploadedByUserName = b.UploadedByUser?.FullName ?? string.Empty,
            UploadedAt = b.UploadedAt,
            ProcessedAt = b.ProcessedAt,
            IsActive = b.IsActive,
        };
    }
}
