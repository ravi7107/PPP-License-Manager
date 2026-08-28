export interface InvestmentSummaryRow {
  total_investment: number;
  total_seats: number;
  used_seats: number;
  utilization_pct: number;
  unused_cost: number;
  active_software_count: number;
  renewals_30d: number;
  renewals_90d: number;
}

export interface TopExpensiveSoftwareRow {
  software_name: string;
  vendor: string | null;
  total_cost: number;
  total_seats: number;
  used_seats: number;
  cost_per_seat: number;
}

export interface UpcomingRenewalRow {
  id: number;
  software_name: string;
  vendor: string | null;
  entity_name: string | null;
  client_name: string | null;
  total_seats: number;
  cost: number | null;
  renewal_date: string | null;
  expiry_date: string | null;
  days_to_expiry: number | null;
}

export interface DepartmentEfficiencyRow {
  department_name: string;
  employee_count: number;
  asset_count: number;
  license_cost: number;
  assets_per_employee: number;
  cost_per_employee: number;
}

export interface AllocationTrendRow {
  month_label: string;
  new_allocations: number;
  active_allocations: number;
}

export interface AssetUtilizationSlice {
  status: string;
  asset_count: number;
  percent_of_fleet: number;
}

export interface GrowthTrendRow {
  month_label: string;
  new_users: number;
  cumulative_users: number;
  new_license_seats: number;
  cumulative_license_seats: number;
}

export interface CapacityRunwayRow {
  software_name: string;
  total_seats: number;
  free_seats: number;
  seats_consumed_last_90_days: number;
  estimated_weeks_of_runway: number | null;
  recommendation: string;
}

// Phase 10 - Pillar 4 (Procurement).
export interface ProcurementSummaryRow {
  total_po_value: number;
  total_invoiced_value: number;
  variance: number;
  prs_with_no_po: number;
  pos_with_no_invoice: number;
  avg_days_approval_to_po_upload: number | null;
  avg_days_po_to_first_invoice: number | null;
}
