export interface ComputerSearchResult {
  id: number;
  asset_tag: string;
  computer_name: string | null;
  host_name: string | null;
  serial_number: string | null;
  asset_type: string | null;
  model: string | null;
  status: string;
  manufacturer: string | null;
  operating_system: string | null;
  location: string | null;
  entity_name: string | null;
  department_name: string | null;
  client_name: string | null;
  assigned_user_name: string | null;
  installed_software: string[] | null;
}

export interface EmployeeSearchResult {
  id: number;
  full_name: string;
  email: string | null;
  role: string | null;
  is_team_leader: boolean;
  status: string;
  department_name: string | null;
  entity_name: string | null;
  assigned_asset_count: number;
  active_license_count: number;
  assigned_assets: string[] | null;
  allocated_software: string[] | null;
}

export interface SoftwareSearchResult {
  id: number;
  name: string;
  vendor: string | null;
  version: string | null;
  license_type: string | null;
  status: string;
  total_seats: number;
  used_seats: number;
  active_installations: number;
}

export interface EntitySearchResult {
  id: number;
  name: string;
  code: string | null;
  address: string | null;
  status: string;
  asset_count: number;
  license_pool_count: number;
  user_count: number;
}

export interface DepartmentSearchResult {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  status: string;
  user_count: number;
  asset_count: number;
}

export interface ClientSearchResult {
  id: number;
  name: string;
  code: string | null;
  contact_name: string | null;
  contact_email: string | null;
  status: string;
  asset_count: number;
  license_pool_count: number;
}

export interface LicenseSearchResult {
  id: number;
  software_name: string;
  vendor: string | null;
  total_seats: number;
  used_seats: number;
  status: string;
  expiry_date: string | null;
  renewal_date: string | null;
  entity_name: string | null;
  client_name: string | null;
}

export type SearchCategory = 'computers' | 'employees' | 'software' | 'entities' | 'departments' | 'clients' | 'licenses';
