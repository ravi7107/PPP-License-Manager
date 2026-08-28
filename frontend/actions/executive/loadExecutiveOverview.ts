import { getExecutiveOverview } from '@/lib/api/analytics.api';

// Adapts the real /api/Analytics/executive-overview response (camelCase,
// matching the C# DTOs) into the snake_case row shapes the Executive
// Dashboard's chart components already expect - the same adapter pattern
// used for the Availability page's loaders.
//
// This REPLACES the previous data source, which was a set of raw SQL
// queries against tables (license_inventory, license_allocations,
// entities) that don't exist anywhere in this application's actual
// database schema or EF Core migrations - every figure on this page was
// permanently zero/stale before this.
async function loadExecutiveOverview() {
  const data = await getExecutiveOverview();

  return {
    investmentSummary: {
      total_investment: data.investmentSummary.totalInvestment,
      total_seats: data.investmentSummary.totalSeats,
      used_seats: data.investmentSummary.usedSeats,
      utilization_pct: data.investmentSummary.utilizationPct,
      unused_cost: data.investmentSummary.unusedCost,
      active_software_count: data.investmentSummary.activeSoftwareCount,
      renewals_30d: data.investmentSummary.renewals30d,
      renewals_90d: data.investmentSummary.renewals90d,
    },

    topExpensiveSoftware: data.topExpensiveSoftware.map((r) => ({
      software_name: r.softwareName,
      vendor: r.vendor,
      total_cost: r.totalCost,
      total_seats: r.totalSeats,
      used_seats: r.usedSeats,
      cost_per_seat: r.costPerSeat,
    })),

    upcomingRenewals: data.upcomingRenewals.map((r) => ({
      id: r.id,
      software_name: r.softwareName,
      vendor: r.vendor,
      entity_name: r.entityName,
      client_name: r.clientName,
      total_seats: r.totalSeats,
      cost: r.cost,
      renewal_date: r.renewalDate,
      expiry_date: r.expiryDate,
      days_to_expiry: r.daysToExpiry,
    })),

    departmentEfficiency: data.departmentEfficiency.map((r) => ({
      department_name: r.departmentName,
      employee_count: r.employeeCount,
      asset_count: r.assetCount,
      license_cost: r.licenseCost,
      assets_per_employee: r.assetsPerEmployee,
      cost_per_employee: r.costPerEmployee,
    })),

    allocationTrends: data.allocationTrends.map((r) => ({
      month_label: r.monthLabel,
      new_allocations: r.newAllocations,
      active_allocations: r.activeAllocations,
    })),

    assetUtilization: data.assetUtilization.map((r) => ({
      status: r.status,
      asset_count: r.assetCount,
      percent_of_fleet: r.percentOfFleet,
    })),

    departmentCost: data.departmentCost.map((r) => ({
      department_name: r.departmentName,
      software_titles: r.softwareTitles,
      total_seats: r.totalSeats,
      used_seats: r.usedSeats,
      total_cost: r.totalCost,
    })),

    clientCost: data.clientCost.map((r) => ({
      client_name: r.clientName,
      software_titles: r.softwareTitles,
      total_seats: r.totalSeats,
      total_cost: r.totalCost,
      allocated_seats: r.allocatedSeats,
    })),

    entityCost: data.entityCost.map((r) => ({
      entity_name: r.entityName,
      software_titles: r.softwareTitles,
      total_seats: r.totalSeats,
      used_seats: r.usedSeats,
      total_cost: r.totalCost,
    })),

    growthTrends: data.growthTrends.map((r) => ({
      month_label: r.monthLabel,
      new_users: r.newUsers,
      cumulative_users: r.cumulativeUsers,
      new_license_seats: r.newLicenseSeats,
      cumulative_license_seats: r.cumulativeLicenseSeats,
    })),

    capacityRunway: data.capacityRunway.map((r) => ({
      software_name: r.softwareName,
      total_seats: r.totalSeats,
      free_seats: r.freeSeats,
      seats_consumed_last_90_days: r.seatsConsumedLast90Days,
      estimated_weeks_of_runway: r.estimatedWeeksOfRunway,
      recommendation: r.recommendation,
    })),

    procurementSummary: {
      total_po_value: data.procurementSummary.totalPoValue,
      total_invoiced_value: data.procurementSummary.totalInvoicedValue,
      variance: data.procurementSummary.variance,
      prs_with_no_po: data.procurementSummary.prsWithNoPo,
      pos_with_no_invoice: data.procurementSummary.posWithNoInvoice,
      avg_days_approval_to_po_upload: data.procurementSummary.avgDaysApprovalToPoUpload,
      avg_days_po_to_first_invoice: data.procurementSummary.avgDaysPoToFirstInvoice,
    },
  };
}

export default loadExecutiveOverview;
