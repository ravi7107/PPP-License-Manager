export interface EntityReportRow {
  entity_name: string;
  software_titles: number;
  total_seats: number;
  used_seats: number;
  total_cost: number;
}

export interface ClientReportRow {
  client_name: string;
  software_titles: number;
  total_seats: number;
  total_cost: number;
  allocated_seats: number;
}

export interface LocationReportRow {
  location: string;
  software_titles: number;
  allocated_seats: number;
}

export interface SoftwareOption {
  id: number;
  name: string;
  vendor: string;
}

export interface SoftwareUtilizationRow {
  license_inventory_id: number;
  software_name: string;
  vendor: string;
  entity_name: string;
  department_name: string;
  client_name: string;
  location: string;
  asset_tag: string | null;
  computer_name: string | null;
  user_name: string | null;
  allocation_date: string;
  allocation_status: string;
}

export interface SoftwareCostRow {
  software_name: string;
  vendor: string | null;
  pool_count: number;
  total_seats: number;
  used_seats: number;
  total_cost: number;
  cost_per_seat: number;
}

export interface DepartmentCostRow {
  department_name: string;
  software_titles: number;
  total_seats: number;
  used_seats: number;
  total_cost: number;
}

export interface UnusedLicenseRow {
  id: number;
  software_name: string;
  vendor: string | null;
  total_seats: number;
  used_seats: number;
  unused_seats: number;
  cost: number | null;
  wasted_cost: number;
  entity_name: string | null;
  client_name: string | null;
  status: string;
}

export interface LicenseExpiryRow {
  id: number;
  software_name: string;
  vendor: string | null;
  total_seats: number;
  expiry_date: string | null;
  renewal_date: string | null;
  maintenance_expiry: string | null;
  days_to_expiry: number | null;
  expiry_status: 'No Expiry Set' | 'Expired' | 'Expiring Soon' | 'Active';
  entity_name: string | null;
  client_name: string | null;
  status: string;
}

export interface AssetAllocationRow {
  asset_tag: string;
  computer_name: string | null;
  asset_type: string | null;
  status: string;
  assigned_user_name: string | null;
  department_name: string | null;
  entity_name: string | null;
  client_name: string | null;
  location: string;
  purchase_date: string | null;
  warranty_expiry: string | null;
}

export interface AssetUtilizationRow {
  status: string;
  asset_count: number;
  assigned_count: number;
  unassigned_count: number;
  percent_of_fleet: number;
}

export interface AuditReportRow {
  id: number;
  table_name: string;
  record_id: number;
  action: string;
  created_by: string | null;
  changed_at: string;
  old_values: unknown;
  new_values: unknown;
}

export interface MonthlySummaryRow {
  month_label: string;
  request_count: number;
  approved_count: number;
  rejected_count: number;
  allocation_count: number;
  asset_count: number;
}
