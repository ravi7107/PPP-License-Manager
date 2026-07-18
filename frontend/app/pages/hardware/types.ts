export type AssetStatus = 'Allocated' | 'Available' | 'Maintenance' | 'Scrap';
export type AssetType = 'Desktop' | 'Laptop' | 'Workstation' | 'Server';

export interface AssetRecord {
  id: number;
  asset_tag: string;
  asset_type: string;
  computer_name: string | null;
  host_name: string | null;
  serial_number: string | null;
  manufacturer: string | null;
  model: string | null;
  purchase_date: string | null;
  warranty_expiry: string | null;
  operating_system: string | null;
  location: string | null;
  status: AssetStatus;
  remarks: string | null;
  assigned_user_id: number | null;
  assigned_user_name: string | null;
  department_id: number | null;
  department_name: string | null;
  entity_id: number | null;
  entity_name: string | null;
  client_id: number | null;
  client_name: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

export interface LookupOption {
  id: number;
  name?: string;
  full_name?: string;
}

export interface AssetFormValues {
  assetTag: string;
  assetType: AssetType;
  computerName: string;
  hostName: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  warrantyExpiry: string;
  operatingSystem: string;
  location: string;
  status: AssetStatus;
  remarks: string;
  assignedUserId: string;
  departmentId: string;
  entityId: string;
  clientId: string;
}

export const ASSET_STATUSES: AssetStatus[] = ['Allocated', 'Available', 'Maintenance', 'Scrap'];
export const ASSET_TYPES: AssetType[] = ['Desktop', 'Laptop', 'Workstation', 'Server'];

export const EMPTY_ASSET_FORM: AssetFormValues = {
  assetTag: '',
  assetType: 'Workstation',
  computerName: '',
  hostName: '',
  serialNumber: '',
  manufacturer: '',
  model: '',
  purchaseDate: '',
  warrantyExpiry: '',
  operatingSystem: '',
  location: '',
  status: 'Available',
  remarks: '',
  assignedUserId: '',
  departmentId: '',
  entityId: '',
  clientId: '',
};
