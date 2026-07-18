export type RequestType =
  | 'New License'
  | 'Reallocation'
  | 'Release'
  | 'Temporary License Allocation'
  | 'Hardware Allocation'
  | 'Hardware Transfer'
  | 'Return Hardware';
export type AllocationType = 'User' | 'Computer' | 'Entity' | 'Client';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export type RequestPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface RequestRecord {
  id: number;
  request_type: RequestType;
  requester_name: string | null;
  department_name: string | null;
  software_name: string | null;
  license_inventory_id: number | null;
  allocation_type: AllocationType;
  asset_id: number | null;
  asset_name: string | null;
  entity_id: number | null;
  entity_name: string | null;
  client_id: number | null;
  client_name: string | null;
  target_user_id: number | null;
  target_user_name: string | null;
  justification: string | null;
  requested_date: string;
  duration_days: number | null;
  status: RequestStatus;
  priority: RequestPriority;
  required_from_date: string | null;
  required_until_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovalRecord {
  id: number;
  request_id: number;
  approver_name: string | null;
  decision: RequestStatus;
  comment: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface LookupOption {
  id: number;
  name: string;
  asset_tag?: string;
}

export interface SoftwareAvailabilityOption {
  license_inventory_id: number;
  software_name: string;
  vendor: string;
  total_seats: number;
  available_licenses: number;
}

export interface RequestFormValues {
  requestType: RequestType;
  softwareId: string;
  licenseInventoryId: string;
  allocationType: AllocationType;
  departmentId: string;
  targetUserId: string;
  assetId: string;
  entityId: string;
  clientId: string;
  justification: string;
  requestedDate: string;
  durationDays: string;
  priority: RequestPriority;
  requiredFromDate: string;
  requiredUntilDate: string;
}

export const REQUEST_TYPES: RequestType[] = [
  'New License',
  'Reallocation',
  'Release',
  'Temporary License Allocation',
  'Hardware Allocation',
  'Hardware Transfer',
  'Return Hardware',
];
export const REQUEST_PRIORITIES: RequestPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
export const ALLOCATION_TYPES: AllocationType[] = ['User', 'Computer', 'Entity', 'Client'];

export const EMPTY_REQUEST_FORM: RequestFormValues = {
  requestType: 'New License',
  softwareId: '',
  licenseInventoryId: '',
  allocationType: 'User',
  departmentId: '',
  targetUserId: '',
  assetId: '',
  entityId: '',
  clientId: '',
  justification: '',
  requestedDate: new Date().toISOString().slice(0, 10),
  durationDays: '',
  priority: 'Medium',
  requiredFromDate: '',
  requiredUntilDate: '',
};

export interface NotificationRecord {
  id: number;
  notification_type: string;
  title: string;
  message: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
