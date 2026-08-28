namespace PPS.LicenseManager.API.DTOs.Analytics;

/*
 * Backs the Executive Dashboard's three analysis pillars - Cost & Spend,
 * Utilization & Efficiency, and Growth & Capacity Planning - computed
 * from the real EF Core model (LicensePurchase/License/ResourceAllocation/
 * Asset/User/Department/Company/Client), entity-scoped the same way as
 * every other Team Lead/Manager-visible endpoint (AnalyticsService applies
 * EntityScopeHelper before building this response).
 *
 * This replaces the legacy raw-SQL "PPS License Asset DB" datasource the
 * Executive Dashboard previously used, which queried tables
 * (license_inventory, license_allocations, entities) that don't exist
 * anywhere in this application's actual database schema/migrations - so
 * every figure on that page was permanently zero/stale before this.
 */
public class ExecutiveOverviewResponse
{
    // --- Pillar 1: Cost & Spend Optimization ---
    public InvestmentSummaryRow InvestmentSummary { get; set; } = new();
    public List<TopExpensiveSoftwareRow> TopExpensiveSoftware { get; set; } = new();
    public List<UpcomingRenewalRow> UpcomingRenewals { get; set; } = new();
    public List<DepartmentCostRow> DepartmentCost { get; set; } = new();
    public List<ClientCostRow> ClientCost { get; set; } = new();
    public List<EntityCostRow> EntityCost { get; set; } = new();

    // --- Pillar 2: Utilization & Efficiency ---
    public List<DepartmentEfficiencyRow> DepartmentEfficiency { get; set; } = new();
    public List<AssetUtilizationRow> AssetUtilization { get; set; } = new();

    // --- Pillar 3: Growth & Capacity Planning ---
    public List<AllocationTrendRow> AllocationTrends { get; set; } = new();
    public List<GrowthTrendRow> GrowthTrends { get; set; } = new();
    public List<CapacityRunwayRow> CapacityRunway { get; set; } = new();

    // --- Pillar 4: Procurement (Phase 10 of the audit-trail extension) ---
    // Additive - does not touch or reorder the three pillars above.
    public ProcurementSummaryRow ProcurementSummary { get; set; } = new();
}

public class InvestmentSummaryRow
{
    public decimal TotalInvestment { get; set; }
    public int TotalSeats { get; set; }
    public int UsedSeats { get; set; }
    public decimal UtilizationPct { get; set; }
    public decimal UnusedCost { get; set; }
    public int ActiveSoftwareCount { get; set; }
    public int Renewals30d { get; set; }
    public int Renewals90d { get; set; }
}

public class TopExpensiveSoftwareRow
{
    public string SoftwareName { get; set; } = string.Empty;
    public string? Vendor { get; set; }
    public decimal TotalCost { get; set; }
    public int TotalSeats { get; set; }
    public int UsedSeats { get; set; }
    public decimal CostPerSeat { get; set; }
}

public class UpcomingRenewalRow
{
    public int Id { get; set; }
    public string SoftwareName { get; set; } = string.Empty;
    public string? Vendor { get; set; }
    public string? EntityName { get; set; }
    public string? ClientName { get; set; }
    public int TotalSeats { get; set; }
    public decimal? Cost { get; set; }
    public DateOnly? RenewalDate { get; set; }
    public DateOnly? ExpiryDate { get; set; }
    public int? DaysToExpiry { get; set; }
}

public class DepartmentEfficiencyRow
{
    public string DepartmentName { get; set; } = string.Empty;
    public int EmployeeCount { get; set; }
    public int AssetCount { get; set; }
    public decimal LicenseCost { get; set; }
    public decimal AssetsPerEmployee { get; set; }
    public decimal CostPerEmployee { get; set; }
}

public class AllocationTrendRow
{
    public string MonthLabel { get; set; } = string.Empty;
    public int NewAllocations { get; set; }
    public int ActiveAllocations { get; set; }
}

public class AssetUtilizationRow
{
    public string Status { get; set; } = string.Empty;
    public int AssetCount { get; set; }
    public int AssignedCount { get; set; }
    public int UnassignedCount { get; set; }
    public decimal PercentOfFleet { get; set; }
}

public class DepartmentCostRow
{
    public string DepartmentName { get; set; } = string.Empty;
    public int SoftwareTitles { get; set; }
    public int TotalSeats { get; set; }
    public int UsedSeats { get; set; }
    public decimal TotalCost { get; set; }
}

public class ClientCostRow
{
    public string ClientName { get; set; } = string.Empty;
    public int SoftwareTitles { get; set; }
    public int TotalSeats { get; set; }
    public decimal TotalCost { get; set; }
    public int AllocatedSeats { get; set; }
}

public class EntityCostRow
{
    public string EntityName { get; set; } = string.Empty;
    public int SoftwareTitles { get; set; }
    public int TotalSeats { get; set; }
    public int UsedSeats { get; set; }
    public decimal TotalCost { get; set; }
}

// New: headcount growth vs license-seat growth, month over month, to show
// whether license capacity is keeping pace with hiring.
public class GrowthTrendRow
{
    public string MonthLabel { get; set; } = string.Empty;
    public int NewUsers { get; set; }
    public int CumulativeUsers { get; set; }
    public int NewLicenseSeats { get; set; }
    public int CumulativeLicenseSeats { get; set; }
}

// New: for each software title, how many seats are currently free and
// how fast they've been consumed recently, projected into an estimated
// runway - flags what needs re-purchasing soon vs what's over-bought.
public class CapacityRunwayRow
{
    public string SoftwareName { get; set; } = string.Empty;
    public int TotalSeats { get; set; }
    public int FreeSeats { get; set; }
    public int SeatsConsumedLast90Days { get; set; }
    public decimal? EstimatedWeeksOfRunway { get; set; }
    public string Recommendation { get; set; } = string.Empty;
}

// Phase 10 - the Procurement KPI tile on the Executive Dashboard. Computed
// from Approved Purchase Requisitions only (a PO/invoice only becomes
// relevant once a PR is Approved - see PurchaseRequisition.cs's own
// comment on why Po* fields stay writable after Approved), scoped by the
// same isEntityRestricted/companyId this whole endpoint already uses -
// see AnalyticsService.BuildProcurementSummary.
public class ProcurementSummaryRow
{
    public decimal TotalPoValue { get; set; }
    public decimal TotalInvoicedValue { get; set; }
    public decimal Variance { get; set; }
    public int PrsWithNoPo { get; set; }
    public int PosWithNoInvoice { get; set; }

    // Null when no Approved PR in scope has both ApprovedAt and a PO
    // upload recorded yet (nothing to average).
    public decimal? AvgDaysApprovalToPoUpload { get; set; }

    // Null when no PO in scope has at least one invoice uploaded yet.
    public decimal? AvgDaysPoToFirstInvoice { get; set; }
}
