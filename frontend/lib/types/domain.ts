export type AssetStatus = 'Active' | 'In Repair' | 'Retired' | 'Decommissioned';

export interface HardwareAsset {
  id: string;
  assetTag: string;
  type: string;
  model: string;
  serialNumber: string;
  team: string;
  assignedUser: string;
  status: AssetStatus;
  purchaseDate: string;
  warrantyExpiry: string;
}

export type LicenseType = 'Perpetual' | 'Subscription' | 'Floating' | 'Node-locked';
export type LicenseStatus = 'Active' | 'Expired' | 'Renewed';

export interface SoftwareLicense {
  id: string;
  softwareName: string;
  vendor: string;
  licenseType: LicenseType;
  totalSeats: number;
  seatsUsed: number;
  department: string;
  cost: number;
  renewalDate: string;
  status: LicenseStatus;
}

export type AllocationStatus = 'Active' | 'Temporarily Shared' | 'Pending Return';

export interface Allocation {
  id: string;
  licenseId: string;
  softwareName: string;
  assignedUser: string;
  team: string;
  allocationDate: string;
  status: AllocationStatus;
  shareEndDate?: string;
}

export type RequestType = 'New License' | 'Temporary Release';
export type RequestStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LicenseRequest {
  id: string;
  requestType: RequestType;
  requester: string;
  team: string;
  softwareName: string;
  justification: string;
  requestedDate: string;
  durationDays?: number;
  status: RequestStatus;
  comment?: string;
}

export interface Team {
  id: string;
  name: string;
  leader: string;
}
