export type AllocationType = 'User' | 'Computer' | 'Entity' | 'Client';
export type AllocationStatus = 'Active' | 'Released';

export interface AllocationRecord {
  id: number;
  license_inventory_id: number;
  software_id: number;
  software_name: string;
  vendor: string;
  allocation_type: AllocationType;
  user_id: number | null;
  user_name: string | null;
  asset_id: number | null;
  asset_tag: string | null;
  computer_name: string | null;
  entity_id: number | null;
  entity_name: string | null;
  client_id: number | null;
  client_name: string | null;
  allocation_date: string;
  release_date: string | null;
  is_temporary: boolean;
  share_end_date: string | null;
  status: AllocationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface SoftwareAvailabilityOption {
  license_inventory_id: number;
  software_name: string;
  vendor: string;
  total_seats: number;
  used_licenses: number;
  available_licenses: number;
}

export interface LookupOption {
  id: number;
  name: string;
  asset_tag?: string;
}

export interface AllocationStats {
  active_allocations: number;
  temporary_allocations: number;
  scheduled_releases: number;
  released_allocations: number;
}

export interface AllocationFormValues {
  licenseInventoryId: string;
  allocationType: AllocationType;
  userId: string;
  assetId: string;
  entityId: string;
  clientId: string;
  allocationDate: string;
  isTemporary: boolean;
  shareEndDate: string;
  notes: string;
}

export const ALLOCATION_TYPES: AllocationType[] = ['User', 'Computer', 'Entity', 'Client'];

export const EMPTY_ALLOCATION_FORM: AllocationFormValues = {
  licenseInventoryId: '',
  allocationType: 'User',
  userId: '',
  assetId: '',
  entityId: '',
  clientId: '',
  allocationDate: new Date().toISOString().slice(0, 10),
  isTemporary: false,
  shareEndDate: '',
  notes: '',
};
