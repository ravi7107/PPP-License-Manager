using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Utilization;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Powers the Utilization Analytics Executive Dashboard. Follows the same
 * shape as AnalyticsService (Executive Dashboard's Cost/Utilization/
 * Growth pillars) - a handful of scoped, AsNoTracking() EF Core queries
 * pulled into in-memory Lists, with every KPI/grouping computed in plain
 * C# LINQ, justified by the same "modest internal inventory scale"
 * reasoning that file's own header comment gives.
 *
 * Every number here comes from UtilizationFact rows flagged
 * IsUsableForCalculation - see UtilizationUploadService.ProcessAsync for
 * how that flag is set. Where a KPI's denominator can't be resolved from
 * real data (e.g. no matching LicensePurchase for "total licenses"), the
 * response says so explicitly via a *_UnavailableReason field rather than
 * defaulting to 0 or fabricating a percentage - see the module's rules
 * against inventing numbers.
 */
public class UtilizationAnalysisService : IUtilizationAnalysisService
{
    private readonly ApplicationDbContext _context;

    public UtilizationAnalysisService(ApplicationDbContext context)
    {
        _context = context;
    }

    private async Task<List<UtilizationFact>> LoadFactsAsync(
        int? softwareId, int? uploadBatchId, bool usableOnly)
    {
        var query = _context.UtilizationFacts
            .AsNoTracking()
            .Include(f => f.UploadBatch)
            .Include(f => f.MatchedUser)
            .Include(f => f.Software)
            .Where(f => f.UploadBatch.IsActive);

        if (softwareId.HasValue)
            query = query.Where(f => f.SoftwareId == softwareId.Value);

        if (uploadBatchId.HasValue)
            query = query.Where(f => f.UploadBatchId == uploadBatchId.Value);

        if (usableOnly)
            query = query.Where(f => f.IsUsableForCalculation);

        return await query.ToListAsync();
    }

    private async Task<UtilizationTierSettings> GetApplicableTierSettingsAsync(int? companyId)
    {
        var settings = companyId.HasValue
            ? await _context.UtilizationTierSettings.AsNoTracking()
                .FirstOrDefaultAsync(s => s.CompanyId == companyId)
            : null;

        settings ??= await _context.UtilizationTierSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.CompanyId == null);

        return settings ?? new UtilizationTierSettings();
    }

    // "assigned" unless the vendor report explicitly says otherwise -
    // most exports only list seats that exist in some assigned/unassigned
    // state, so presence in the report is the safest default signal.
    private static bool IsAssigned(UtilizationFact f) => f.AssignedFlag != false;

    private static bool HasUsageEvidence(UtilizationFact f) =>
        (f.DaysUsedInPeriod.HasValue && f.DaysUsedInPeriod.Value > 0) ||
        (f.LastUsedDate.HasValue && !f.DaysUsedInPeriod.HasValue);

    private static string UserKey(UtilizationFact f) =>
        f.MatchedUserId?.ToString() ?? $"raw:{f.RawUserIdentifier.Trim().ToLowerInvariant()}";

    private static string ClassifyTier(UtilizationFact f, UtilizationTierSettings settings, int periodDays)
    {
        if (!f.DaysUsedInPeriod.HasValue)
            return "Insufficient Usage Detail";

        if (f.DaysUsedInPeriod.Value <= 0)
            return "Never Used";

        if (periodDays <= 0)
            return "Insufficient Usage Detail";

        var pct = (decimal)f.DaysUsedInPeriod.Value / periodDays * 100m;

        if (pct >= settings.HeavyMinPct) return "Heavy";
        if (pct >= settings.RegularMinPct) return "Regular";
        if (pct >= settings.OccasionalMinPct) return "Occasional";
        if (pct >= settings.LowMinPct) return "Low Utilization";
        return "Inactive";
    }

    public async Task<UtilizationOverviewResponse> GetOverviewAsync(int? softwareId, int? uploadBatchId)
    {
        var allFacts = await LoadFactsAsync(softwareId, uploadBatchId, usableOnly: false);
        var usableFacts = allFacts.Where(f => f.IsUsableForCalculation).ToList();

        if (usableFacts.Count == 0)
        {
            return new UtilizationOverviewResponse { HasData = allFacts.Count > 0 };
        }

        var assignedFacts = usableFacts.Where(IsAssigned).ToList();
        var assignedUserKeys = assignedFacts.Select(UserKey).Distinct().ToHashSet();
        var usedUserKeys = assignedFacts.Where(HasUsageEvidence).Select(UserKey).Distinct().ToHashSet();
        var neverUsedUserKeys = assignedFacts
            .Where(f => f.DaysUsedInPeriod == 0)
            .Select(UserKey)
            .Distinct()
            .ToHashSet();

        var assignedSeats = assignedUserKeys.Count;
        var usedSeats = usedUserKeys.Count;
        var unusedSeats = Math.Max(0, assignedSeats - usedSeats);

        int? totalLicenses = null;
        string? totalLicensesUnavailableReason = null;

        var distinctSoftwareIds = usableFacts.Select(f => f.SoftwareId).Distinct().ToList();

        if (softwareId.HasValue)
        {
            var sum = await _context.LicensePurchases
                .AsNoTracking()
                .Where(p => p.IsActive && p.SoftwareId == softwareId.Value)
                .SumAsync(p => (int?)p.TotalLicenses);

            if (sum.HasValue && sum.Value > 0)
                totalLicenses = sum.Value;
            else
                totalLicensesUnavailableReason = "No purchased-license record found for this product.";
        }
        else if (distinctSoftwareIds.Count == 1 && distinctSoftwareIds[0].HasValue)
        {
            var sum = await _context.LicensePurchases
                .AsNoTracking()
                .Where(p => p.IsActive && p.SoftwareId == distinctSoftwareIds[0]!.Value)
                .SumAsync(p => (int?)p.TotalLicenses);

            totalLicenses = sum is > 0 ? sum : null;
            if (totalLicenses == null)
                totalLicensesUnavailableReason = "No purchased-license record found for this product.";
        }
        else
        {
            totalLicensesUnavailableReason =
                "Select a specific software to see total purchased seats - the current selection spans multiple products.";
        }

        var reportingStart = allFacts.Min(f => f.UploadBatch.ReportingPeriodStart);
        var reportingEnd = allFacts.Max(f => f.UploadBatch.ReportingPeriodEnd);

        return new UtilizationOverviewResponse
        {
            HasData = true,
            ReportingPeriodStart = reportingStart,
            ReportingPeriodEnd = reportingEnd,
            UploadBatchCount = allFacts.Select(f => f.UploadBatchId).Distinct().Count(),
            TotalLicenses = totalLicenses,
            TotalLicensesUnavailableReason = totalLicensesUnavailableReason,
            AssignedSeats = assignedSeats,
            UsedSeats = usedSeats,
            UnusedSeats = unusedSeats,
            UtilizationPct = assignedSeats > 0
                ? Math.Round((decimal)usedSeats / assignedSeats * 100, 1)
                : null,
            UtilizationPctUnavailableReason = assignedSeats > 0
                ? null
                : "No assigned seats found in the uploaded data.",
            WastagePct = assignedSeats > 0
                ? Math.Round((decimal)unusedSeats / assignedSeats * 100, 1)
                : null,
            WastagePctUnavailableReason = assignedSeats > 0
                ? null
                : "No assigned seats found in the uploaded data.",
            NeverUsedUserCount = neverUsedUserKeys.Count,
            RowsExcludedFromCalculation = allFacts.Count - usableFacts.Count,
            DataCompletenessPct = allFacts.Count > 0
                ? Math.Round((decimal)usableFacts.Count / allFacts.Count * 100, 1)
                : 0m,
        };
    }

    public async Task<List<UtilizationTierDistributionRow>> GetTierDistributionAsync(
        int? softwareId, int? uploadBatchId)
    {
        var facts = (await LoadFactsAsync(softwareId, uploadBatchId, usableOnly: true))
            .Where(IsAssigned)
            .ToList();

        if (facts.Count == 0) return new List<UtilizationTierDistributionRow>();

        var settings = await GetApplicableTierSettingsAsync(facts.First().UploadBatch.CompanyId);

        // One tier per USER, not per row - a user can appear in more than
        // one row (e.g. multiple offerings in the same export); their
        // best (highest) tier represents them in this distribution.
        var tierRank = new[] { "Heavy", "Regular", "Occasional", "Low Utilization", "Inactive", "Never Used", "Insufficient Usage Detail" };

        var byUser = facts
            .GroupBy(UserKey)
            .Select(g => g
                .Select(f => ClassifyTier(f, settings, PeriodDays(f.UploadBatch)))
                .OrderBy(t => Array.IndexOf(tierRank, t))
                .First())
            .ToList();

        var total = byUser.Count;

        return byUser
            .GroupBy(t => t)
            .Select(g => new UtilizationTierDistributionRow
            {
                Tier = g.Key,
                UserCount = g.Count(),
                PercentOfAssigned = total > 0 ? Math.Round((decimal)g.Count() / total * 100, 1) : 0m,
            })
            .OrderBy(r => Array.IndexOf(tierRank, r.Tier))
            .ToList();
    }

    public async Task<List<UtilizationDepartmentConcentrationRow>> GetDepartmentConcentrationAsync(
        int? softwareId, int? uploadBatchId)
    {
        var facts = (await LoadFactsAsync(softwareId, uploadBatchId, usableOnly: true))
            .Where(IsAssigned)
            .ToList();

        if (facts.Count == 0) return new List<UtilizationDepartmentConcentrationRow>();

        var settings = await GetApplicableTierSettingsAsync(facts.First().UploadBatch.CompanyId);

        var departmentIds = facts.Where(f => f.MatchedDepartmentId.HasValue)
            .Select(f => f.MatchedDepartmentId!.Value).Distinct().ToList();

        var departmentNames = await _context.Departments
            .AsNoTracking()
            .Where(d => departmentIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

        string LabelFor(UtilizationFact f) => f.MatchedDepartmentId.HasValue
            ? departmentNames.GetValueOrDefault(f.MatchedDepartmentId.Value, "Unknown Department")
            : (string.IsNullOrWhiteSpace(f.RawDepartmentText) ? "Unassigned / Not Reported" : f.RawDepartmentText!);

        var byUserPerLabel = facts
            .GroupBy(f => (Label: LabelFor(f), Matched: f.MatchedDepartmentId.HasValue))
            .Select(g => new
            {
                g.Key.Label,
                g.Key.Matched,
                Users = g.GroupBy(UserKey)
                    .Select(ug => ClassifyTier(ug.OrderByDescending(f => f.DaysUsedInPeriod ?? -1).First(),
                        settings, PeriodDays(ug.First().UploadBatch)))
                    .ToList(),
            });

        return byUserPerLabel.Select(g => new UtilizationDepartmentConcentrationRow
        {
            DepartmentLabel = g.Label,
            IsMatchedToMaster = g.Matched,
            HeavyCount = g.Users.Count(t => t == "Heavy"),
            RegularCount = g.Users.Count(t => t == "Regular"),
            OccasionalCount = g.Users.Count(t => t == "Occasional"),
            LowCount = g.Users.Count(t => t == "Low Utilization"),
            InactiveCount = g.Users.Count(t => t == "Inactive"),
            NeverUsedCount = g.Users.Count(t => t == "Never Used"),
            TotalCount = g.Users.Count,
        })
        .OrderByDescending(r => r.TotalCount)
        .ToList();
    }

    public async Task<List<UtilizationLeastUsedUserRow>> GetLeastUsedUsersAsync(
        int? softwareId, int? uploadBatchId, int take)
    {
        var facts = (await LoadFactsAsync(softwareId, uploadBatchId, usableOnly: true))
            .Where(IsAssigned)
            .ToList();

        if (facts.Count == 0) return new List<UtilizationLeastUsedUserRow>();

        var settings = await GetApplicableTierSettingsAsync(facts.First().UploadBatch.CompanyId);

        var departmentIds = facts.Where(f => f.MatchedDepartmentId.HasValue)
            .Select(f => f.MatchedDepartmentId!.Value).Distinct().ToList();

        var departmentNames = await _context.Departments
            .AsNoTracking()
            .Where(d => departmentIds.Contains(d.Id))
            .ToDictionaryAsync(d => d.Id, d => d.DepartmentName);

        return facts
            .GroupBy(UserKey)
            .Select(g =>
            {
                var best = g.OrderByDescending(f => f.DaysUsedInPeriod ?? -1).First();

                return new UtilizationLeastUsedUserRow
                {
                    DisplayName = best.MatchedUser?.FullName ?? best.RawUserDisplayName ?? best.RawUserIdentifier,
                    RawUserIdentifier = best.RawUserIdentifier,
                    IsMatchedToUserMaster = best.MatchedUserId.HasValue,
                    SoftwareLabel = best.Software?.Name ?? best.RawSoftwareText,
                    DepartmentLabel = best.MatchedDepartmentId.HasValue
                        ? departmentNames.GetValueOrDefault(best.MatchedDepartmentId.Value)
                        : best.RawDepartmentText,
                    DaysUsedInPeriod = best.DaysUsedInPeriod,
                    LastUsedDate = best.LastUsedDate,
                    Tier = ClassifyTier(best, settings, PeriodDays(best.UploadBatch)),
                };
            })
            .OrderBy(r => r.DaysUsedInPeriod ?? -1)
            .Take(take)
            .ToList();
    }

    public async Task<List<UtilizationUsageDistributionBucket>> GetUsageDistributionAsync(
        int? softwareId, int? uploadBatchId)
    {
        var facts = (await LoadFactsAsync(softwareId, uploadBatchId, usableOnly: true))
            .Where(f => IsAssigned(f) && f.DaysUsedInPeriod.HasValue)
            .ToList();

        var buckets = new (string Label, int Min, int Max)[]
        {
            ("0 days", 0, 0),
            ("1-10 days", 1, 10),
            ("11-30 days", 11, 30),
            ("31-60 days", 31, 60),
            ("61-90 days", 61, 90),
            ("90+ days", 91, int.MaxValue),
        };

        return buckets.Select(b => new UtilizationUsageDistributionBucket
        {
            BucketLabel = b.Label,
            UserCount = facts
                .GroupBy(UserKey)
                .Select(g => g.Max(f => f.DaysUsedInPeriod!.Value))
                .Count(days => days >= b.Min && days <= b.Max),
        }).ToList();
    }

    private static int PeriodDays(UtilizationUploadBatch batch) =>
        batch.ReportingPeriodEnd.DayNumber - batch.ReportingPeriodStart.DayNumber + 1;
}
