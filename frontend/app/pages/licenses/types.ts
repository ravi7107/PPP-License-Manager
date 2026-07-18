export type LicenseStatus = 'Active' | 'Expired' | 'Retired';
export type LicenseType = 'Perpetual' | 'Subscription' | 'Floating' | 'Node-locked';

export interface SoftwareInventoryRecord {
  id: number;
  software_id: number;
  software_name: string;
  vendor: string;
  version: string | null;
  license_type: string;
  license_count: number;
  cost_per_license: number;
  total_cost: number;
  expiry_date: string | null;
  maintenance_expiry: string | null;
  status: LicenseStatus;
  used_licenses: number;
  available_licenses: number;
  associated_assets: string;
  associated_users: string;
  entity_id: number | null;
  entity_name: string | null;
  department_id: number | null;
  department_name: string | null;
  client_id: number | null;
  client_name: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SoftwareStats {
  total_titles: number;
  total_licenses: number;
  used_licenses: number;
  available_licenses: number;
  total_cost: number;
  expiring_soon: number;
  maintenance_expiring_soon: number;
  avg_cost_per_license: number;
  utilization_pct: number;
}

export interface SoftwareFormValues {
  softwareId?: number;
  softwareName: string;
  vendor: string;
  version: string;
  licenseType: LicenseType;
  licenseCount: string;
  costPerLicense: string;
  expiryDate: string;
  maintenanceExpiry: string;
  status: LicenseStatus;
  entityId: string;
  departmentId: string;
  clientId: string;
}

export const LICENSE_TYPES: LicenseType[] = ['Perpetual', 'Subscription', 'Floating', 'Node-locked'];
export const LICENSE_STATUSES: LicenseStatus[] = ['Active', 'Expired', 'Retired'];

export const EMPTY_SOFTWARE_FORM: SoftwareFormValues = {
  softwareName: '',
  vendor: '',
  version: '',
  licenseType: 'Subscription',
  licenseCount: '0',
  costPerLicense: '0',
  expiryDate: '',
  maintenanceExpiry: '',
  status: 'Active',
  entityId: '',
  departmentId: '',
  clientId: '',
};
