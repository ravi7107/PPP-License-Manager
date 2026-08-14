using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Analytics;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

/*
 * Powers the Executive Dashboard's three management-strategy pillars -
 * Cost & Spend, Utilization & Efficiency, Growth & Capacity Planning -
 * from the real EF Core model. Everything here is computed in-memory
 * after a handful of scoped queries rather than as one giant SQL
 * aggregate: the row counts this app deals with are modest (an internal
 * license/asset inventory, not big data), and doing the month-bucketing
 * and multi-way joins in plain C# is far easier to get right - and to
 * verify without a compiler available in this environment - than complex
 * translated LINQ or hand-written SQL.
 */
public class AnalyticsService : IAnalyticsService
{
    private readonly ApplicationDbContext _context;

    public AnalyticsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ExecutiveOverviewResponse> GetExecutiveOverviewAsync(
        bool isEntityRestricted,
        int? companyId)
    {
        if (isEntityRestricted && companyId == null)
        {
            // A Manager with no Entity assigned yet sees nothing - same
            // rule as every other entity-scoped endpoint in this app.
            return new ExecutiveOverviewResponse();
        }

        var now = DateTime.UtcNow;
        var today = DateOnly.FromDateTime(now);

        // --- Load scoped source data ---

        var purchasesQuery = _context.LicensePurchases
            .AsNoTracking()
            .Include(p => p.Software)
            .Include(p => p.Company)
            .Include(p => p.Department)
            .Include(p => p.Client)
            .Where(p => p.IsActive);

        if (isEntityRestricted)
        {
            purchasesQuery = purchasesQuery.Where(
                p => p.CompanyId == null || p.CompanyId == companyId);
        }

        var purchases = await purchasesQuery.ToListAsync();
        var purchaseIds = purchases.Select(p => p.Id).ToHashSet();

        var licenses = await _context.Licenses
            .AsNoTracking()
            .Where(l => l.LicensePurchaseId != null &&
                        purchaseIds.Contains(l.LicensePurchaseId.Value))
            .ToListAsync();

        var licenseIds = licenses.Select(l => l.Id).ToHashSet();

        var allocations = await _context.ResourceAllocations
            .AsNoTracking()
            .Where(r => licenseIds.Contains(r.LicenseId))
            .ToListAsync();

        var departmentsQuery = _context.Departments.AsNoTracking();

        if (isEntityRestricted)
        {
            departmentsQuery = departmentsQuery.Where(
                d => d.CompanyId == companyId);
        }

        var departments = await departmentsQuery.ToListAsync();
        var departmentIds = departments.Select(d => d.Id).ToHashSet();

        var usersQuery = _context.Users.AsNoTracking();

        if (isEntityRestricted)
        {
            usersQuery = usersQuery.Where(u => u.CompanyId == companyId);
        }

        var users = await usersQuery.ToListAsync();

        // departmentIds already covers every department when this call
        // isn't restricted (departmentsQuery has no CompanyId filter in
        // that case), so filtering by it here is always safe and keeps
        // the asset set consistent with the department-efficiency join
        // below either way.
        var assets = await _context.Assets
            .AsNoTracking()
            .Where(a => a.IsActive && departmentIds.Contains(a.DepartmentId))
            .ToListAsync();
        var assetIds = assets.Select(a => a.Id).ToHashSet();

        var activeAssignedAssetIds = await _context.AssetAssignments
            .AsNoTracking()
            .Where(x => x.IsActive && assetIds.Contains(x.AssetId))
            .Select(x => x.AssetId)
            .Distinct()
            .ToListAsync();

        var assignedAssetIdSet = activeAssignedAssetIds.ToHashSet();

        // Used seats = allocations currently active/Allocated, keyed by
        // the LicensePurchase their License belongs to.
        var licenseToPurchase = licenses
            .Where(l => l.LicensePurchaseId.HasValue)
            .ToDictionary(l => l.Id, l => l.LicensePurchaseId!.Value);

        var activeAllocations = allocations
            .Where(a => a.IsActive &&
                        string.Equals(a.Status, "Allocated", StringComparison.OrdinalIgnoreCase))
            .ToList();

        var usedSeatsByPurchase = activeAllocations
            .Where(a => licenseToPurchase.ContainsKey(a.LicenseId))
            .GroupBy(a => licenseToPurchase[a.LicenseId])
            .ToDictionary(g => g.Key, g => g.Count());

        int UsedSeats(int purchaseId) =>
            usedSeatsByPurchase.TryGetValue(purchaseId, out var v) ? v : 0;

        var response = new ExecutiveOverviewResponse
        {
            InvestmentSummary = BuildInvestmentSummary(purchases, UsedSeats, today),
            TopExpensiveSoftware = BuildTopExpensiveSoftware(purchases, UsedSeats),
            UpcomingRenewals = BuildUpcomingRenewals(purchases, today),
            DepartmentCost = BuildDepartmentCost(purchases, UsedSeats),
            ClientCost = BuildClientCost(purchases, activeAllocations, licenseToPurchase),
            EntityCost = BuildEntityCost(purchases, UsedSeats),
            DepartmentEfficiency = BuildDepartmentEfficiency(departments, users, assets, purchases),
            AssetUtilization = BuildAssetUtilization(assets, assignedAssetIdSet),
            AllocationTrends = BuildAllocationTrends(allocations, now),
            GrowthTrends = BuildGrowthTrends(users, purchases, now),
            CapacityRunway = BuildCapacityRunway(purchases, licenses, allocations, now),
        };

        return response;
    }

    // --- Pillar 1: Cost & Spend ---

    private static InvestmentSummaryRow BuildInvestmentSummary(
        List<LicensePurchase> purchases,
        Func<int, int> usedSeats,
        DateOnly today)
    {
        var totalInvestment = purchases.Sum(p => p.Cost ?? 0m);
        var totalSeats = purchases.Sum(p => p.TotalLicenses);
        var usedTotal = purchases.Sum(p => usedSeats(p.Id));

        var utilizationPct = totalSeats > 0
            ? Math.Round((decimal)usedTotal / totalSeats * 100, 1)
            : 0m;

        var unusedCost = purchases.Sum(p =>
        {
            if (p.TotalLicenses <= 0) return 0m;
            var unusedSeats = p.TotalLicenses - usedSeats(p.Id);
            if (unusedSeats <= 0) return 0m;
            return (decimal)unusedSeats / p.TotalLicenses * (p.Cost ?? 0m);
        });

        var renewals30 = purchases.Count(p =>
            p.ExpiryDate.HasValue &&
            p.ExpiryDate.Value >= today &&
            p.ExpiryDate.Value <= today.AddDays(30));

        var renewals90 = purchases.Count(p =>
            p.ExpiryDate.HasValue &&
            p.ExpiryDate.Value >= today &&
            p.ExpiryDate.Value <= today.AddDays(90));

        return new InvestmentSummaryRow
        {
            TotalInvestment = totalInvestment,
            TotalSeats = totalSeats,
            UsedSeats = usedTotal,
            UtilizationPct = utilizationPct,
            UnusedCost = Math.Round(unusedCost, 2),
            ActiveSoftwareCount = purchases.Select(p => p.SoftwareId).Distinct().Count(),
            Renewals30d = renewals30,
            Renewals90d = renewals90,
        };
    }

    private static List<TopExpensiveSoftwareRow> BuildTopExpensiveSoftware(
        List<LicensePurchase> purchases,
        Func<int, int> usedSeats)
    {
        return purchases
            .GroupBy(p => new { p.SoftwareId, SoftwareName = p.Software.Name, p.Software.Vendor })
            .Select(g =>
            {
                var totalCost = g.Sum(p => p.Cost ?? 0m);
                var totalSeats = g.Sum(p => p.TotalLicenses);
                var used = g.Sum(p => usedSeats(p.Id));

                return new TopExpensiveSoftwareRow
                {
                    SoftwareName = g.Key.SoftwareName,
                    Vendor = g.Key.Vendor,
                    TotalCost = totalCost,
                    TotalSeats = totalSeats,
                    UsedSeats = used,
                    CostPerSeat = totalSeats > 0
                        ? Math.Round(totalCost / totalSeats, 2)
                        : 0m,
                };
            })
            .OrderByDescending(r => r.TotalCost)
            .Take(8)
            .ToList();
    }

    private static List<UpcomingRenewalRow> BuildUpcomingRenewals(
        List<LicensePurchase> purchases,
        DateOnly today)
    {
        return purchases
            .Where(p => p.ExpiryDate.HasValue && p.ExpiryDate.Value <= today.AddDays(90))
            .OrderBy(p => p.ExpiryDate)
            .Take(10)
            .Select(p => new UpcomingRenewalRow
            {
                Id = p.Id,
                SoftwareName = p.Software.Name,
                Vendor = p.Software.Vendor,
                EntityName = p.Company?.Name,
                ClientName = p.Client?.Name,
                TotalSeats = p.TotalLicenses,
                Cost = p.Cost,
                RenewalDate = p.ExpiryDate,
                ExpiryDate = p.ExpiryDate,
                DaysToExpiry = p.ExpiryDate.HasValue
                    ? p.ExpiryDate.Value.DayNumber - today.DayNumber
                    : null,
            })
            .ToList();
    }

    private static List<DepartmentCostRow> BuildDepartmentCost(
        List<LicensePurchase> purchases,
        Func<int, int> usedSeats)
    {
        return purchases
            .GroupBy(p => p.Department?.DepartmentName ?? "Unassigned")
            .Select(g => new DepartmentCostRow
            {
                DepartmentName = g.Key,
                SoftwareTitles = g.Select(p => p.SoftwareId).Distinct().Count(),
                TotalSeats = g.Sum(p => p.TotalLicenses),
                UsedSeats = g.Sum(p => usedSeats(p.Id)),
                TotalCost = g.Sum(p => p.Cost ?? 0m),
            })
            .OrderByDescending(r => r.TotalCost)
            .ToList();
    }

    private static List<ClientCostRow> BuildClientCost(
        List<LicensePurchase> purchases,
        List<ResourceAllocation> activeAllocations,
        Dictionary<int, int> licenseToPurchase)
    {
        // Only purchases actually tied to a Client - most purchases are
        // Entity-scoped and have ClientId == null. Dictionary<TKey,TValue>
        // throws ArgumentNullException on a null key even when TKey is a
        // nullable value type, so grouping by the raw (nullable) ClientId
        // below crashed this entire endpoint the moment any purchase had
        // no client - which is the common case, not an edge case. Filtering
        // to HasValue up front (same pattern BuildDepartmentEfficiency
        // already uses for its own nullable DepartmentId groupings below)
        // keeps every downstream key a plain non-nullable int.
        var purchaseClientById = purchases
            .Where(p => p.ClientId.HasValue)
            .ToDictionary(p => p.Id, p => p.ClientId!.Value);

        var allocatedSeatsByClient = activeAllocations
            .Where(a => licenseToPurchase.ContainsKey(a.LicenseId))
            .Select(a => licenseToPurchase[a.LicenseId])
            .Where(purchaseClientById.ContainsKey)
            .GroupBy(purchaseId => purchaseClientById[purchaseId])
            .ToDictionary(g => g.Key, g => g.Count());

        return purchases
            .GroupBy(p => new { p.ClientId, ClientName = p.Client?.Name ?? "Unassigned" })
            .Select(g => new ClientCostRow
            {
                ClientName = g.Key.ClientName,
                SoftwareTitles = g.Select(p => p.SoftwareId).Distinct().Count(),
                TotalSeats = g.Sum(p => p.TotalLicenses),
                TotalCost = g.Sum(p => p.Cost ?? 0m),
                AllocatedSeats = g.Key.ClientId.HasValue &&
                    allocatedSeatsByClient.TryGetValue(g.Key.ClientId.Value, out var v)
                        ? v
                        : 0,
            })
            .OrderByDescending(r => r.TotalCost)
            .ToList();
    }

    private static List<EntityCostRow> BuildEntityCost(
        List<LicensePurchase> purchases,
        Func<int, int> usedSeats)
    {
        return purchases
            .GroupBy(p => p.Company?.Name ?? "Unassigned")
            .Select(g => new EntityCostRow
            {
                EntityName = g.Key,
                SoftwareTitles = g.Select(p => p.SoftwareId).Distinct().Count(),
                TotalSeats = g.Sum(p => p.TotalLicenses),
                UsedSeats = g.Sum(p => usedSeats(p.Id)),
                TotalCost = g.Sum(p => p.Cost ?? 0m),
            })
            .OrderByDescending(r => r.TotalCost)
            .ToList();
    }

    // --- Pillar 2: Utilization & Efficiency ---

    private static List<DepartmentEfficiencyRow> BuildDepartmentEfficiency(
        List<Department> departments,
        List<User> users,
        List<Asset> assets,
        List<LicensePurchase> purchases)
    {
        var employeeCountByDept = users
            .Where(u => u.IsActive && u.DepartmentId.HasValue)
            .GroupBy(u => u.DepartmentId!.Value)
            .ToDictionary(g => g.Key, g => g.Count());

        var assetCountByDept = assets
            .GroupBy(a => a.DepartmentId)
            .ToDictionary(g => g.Key, g => g.Count());

        var costByDept = purchases
            .Where(p => p.DepartmentId.HasValue)
            .GroupBy(p => p.DepartmentId!.Value)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.Cost ?? 0m));

        return departments
            .Select(d =>
            {
                var employeeCount = employeeCountByDept.TryGetValue(d.Id, out var e) ? e : 0;
                var assetCount = assetCountByDept.TryGetValue(d.Id, out var a) ? a : 0;
                var licenseCost = costByDept.TryGetValue(d.Id, out var c) ? c : 0m;

                return new DepartmentEfficiencyRow
                {
                    DepartmentName = d.DepartmentName,
                    EmployeeCount = employeeCount,
                    AssetCount = assetCount,
                    LicenseCost = licenseCost,
                    AssetsPerEmployee = employeeCount > 0
                        ? Math.Round((decimal)assetCount / employeeCount, 2)
                        : 0m,
                    CostPerEmployee = employeeCount > 0
                        ? Math.Round(licenseCost / employeeCount, 2)
                        : 0m,
                };
            })
            .OrderByDescending(r => r.CostPerEmployee)
            .ToList();
    }

    private static List<AssetUtilizationRow> BuildAssetUtilization(
        List<Asset> assets,
        HashSet<int> assignedAssetIdSet)
    {
        var total = assets.Count;

        return assets
            .GroupBy(a => a.Status)
            .Select(g =>
            {
                var assignedCount = g.Count(a => assignedAssetIdSet.Contains(a.Id));

                return new AssetUtilizationRow
                {
                    Status = g.Key,
                    AssetCount = g.Count(),
                    AssignedCount = assignedCount,
                    UnassignedCount = g.Count() - assignedCount,
                    PercentOfFleet = total > 0
                        ? Math.Round((decimal)g.Count() / total * 100, 1)
                        : 0m,
                };
            })
            .OrderByDescending(r => r.AssetCount)
            .ToList();
    }

    // --- Pillar 3: Growth & Capacity Planning ---

    private static List<(DateTime Start, string Label)> LastTwelveMonths(DateTime now)
    {
        var currentMonthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        return Enumerable.Range(0, 12)
            .Select(n => currentMonthStart.AddMonths(-11 + n))
            .Select(m => (m, m.ToString("MMM yyyy")))
            .ToList();
    }

    private static List<AllocationTrendRow> BuildAllocationTrends(
        List<ResourceAllocation> allocations,
        DateTime now)
    {
        var months = LastTwelveMonths(now);

        return months.Select(m =>
        {
            var monthEnd = m.Start.AddMonths(1).AddTicks(-1);

            var newAllocations = allocations.Count(a =>
                a.AllocatedOn >= m.Start && a.AllocatedOn <= monthEnd);

            var activeAsOfMonth = allocations.Count(a =>
                a.AllocatedOn <= monthEnd &&
                (a.ActualReturnDate == null || a.ActualReturnDate > monthEnd));

            return new AllocationTrendRow
            {
                MonthLabel = m.Label,
                NewAllocations = newAllocations,
                ActiveAllocations = activeAsOfMonth,
            };
        }).ToList();
    }

    private static List<GrowthTrendRow> BuildGrowthTrends(
        List<User> users,
        List<LicensePurchase> purchases,
        DateTime now)
    {
        var months = LastTwelveMonths(now);

        return months.Select(m =>
        {
            var monthEnd = m.Start.AddMonths(1).AddTicks(-1);
            var monthEndDate = DateOnly.FromDateTime(monthEnd);

            var newUsers = users.Count(u =>
                u.CreatedAt >= m.Start && u.CreatedAt <= monthEnd);

            var cumulativeUsers = users.Count(u => u.CreatedAt <= monthEnd);

            var newSeats = purchases
                .Where(p =>
                {
                    var purchaseMonth = new DateTime(
                        p.PurchaseDate.Year, p.PurchaseDate.Month, 1,
                        0, 0, 0, DateTimeKind.Utc);

                    return purchaseMonth == m.Start;
                })
                .Sum(p => p.TotalLicenses);

            var cumulativeSeats = purchases
                .Where(p => p.PurchaseDate <= monthEndDate)
                .Sum(p => p.TotalLicenses);

            return new GrowthTrendRow
            {
                MonthLabel = m.Label,
                NewUsers = newUsers,
                CumulativeUsers = cumulativeUsers,
                NewLicenseSeats = newSeats,
                CumulativeLicenseSeats = cumulativeSeats,
            };
        }).ToList();
    }

    private static List<CapacityRunwayRow> BuildCapacityRunway(
        List<LicensePurchase> purchases,
        List<License> licenses,
        List<ResourceAllocation> allocations,
        DateTime now)
    {
        var cutoff90 = now.AddDays(-90);

        var licenseSoftwareId = licenses.ToDictionary(l => l.Id, l => l.SoftwareId);

        var freeSeatsBySoftware = licenses
            .Where(l => l.IsActive &&
                        string.Equals(l.Status, "Available", StringComparison.OrdinalIgnoreCase) &&
                        l.ExpiryDate > now)
            .GroupBy(l => l.SoftwareId)
            .ToDictionary(g => g.Key, g => g.Count());

        var consumedLast90BySoftware = allocations
            .Where(a => a.AllocatedOn >= cutoff90 &&
                        licenseSoftwareId.ContainsKey(a.LicenseId))
            .GroupBy(a => licenseSoftwareId[a.LicenseId])
            .ToDictionary(g => g.Key, g => g.Count());

        return purchases
            .GroupBy(p => new { p.SoftwareId, SoftwareName = p.Software.Name })
            .Select(g =>
            {
                var totalSeats = g.Sum(p => p.TotalLicenses);
                var freeSeats = freeSeatsBySoftware.TryGetValue(g.Key.SoftwareId, out var f) ? f : 0;
                var consumed90 = consumedLast90BySoftware.TryGetValue(g.Key.SoftwareId, out var c) ? c : 0;

                decimal? weeksOfRunway = null;

                if (consumed90 > 0)
                {
                    var weeklyConsumptionRate = consumed90 / (90m / 7m);

                    if (weeklyConsumptionRate > 0)
                    {
                        weeksOfRunway = Math.Round(freeSeats / weeklyConsumptionRate, 1);
                    }
                }

                string recommendation;

                if (freeSeats <= 0 && consumed90 > 0)
                {
                    recommendation = "Out of free seats with active demand - purchase more soon.";
                }
                else if (weeksOfRunway.HasValue && weeksOfRunway.Value < 4)
                {
                    recommendation = "Under 4 weeks of runway at the current pace - plan a purchase.";
                }
                else if (consumed90 == 0 && totalSeats > 0 && freeSeats >= totalSeats * 0.3m)
                {
                    recommendation = "No recent demand and 30%+ seats unused - candidate to right-size at renewal.";
                }
                else
                {
                    recommendation = "Healthy.";
                }

                return new CapacityRunwayRow
                {
                    SoftwareName = g.Key.SoftwareName,
                    TotalSeats = totalSeats,
                    FreeSeats = freeSeats,
                    SeatsConsumedLast90Days = consumed90,
                    EstimatedWeeksOfRunway = weeksOfRunway,
                    Recommendation = recommendation,
                };
            })
            .OrderBy(r => r.EstimatedWeeksOfRunway ?? decimal.MaxValue)
            .ToList();
    }
}
