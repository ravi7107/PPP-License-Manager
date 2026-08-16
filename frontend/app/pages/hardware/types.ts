export type AssetStatus =
  | "Available"
  | "Assigned"
  | "Maintenance"
  | "Reserved"
  | "Retired";

export type AssetType =
  | "Desktop"
  | "Laptop"
  | "Workstation"
  | "Server";

export interface AssetRecord {
  id: number;

  assetTag: string;
  assetName: string;
  assetType: AssetType;

  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  hostName?: string;

  processor?: string;
  ramGb?: number;
  storageGb?: number;
  graphicsCard?: string;
  operatingSystem?: string;

  departmentId: number;
  departmentName: string;

  companyId?: number;
  companyName?: string;

  purchaseDate?: string;
  warrantyExpiry?: string;

  remarks?: string;

  status: AssetStatus;

  isReadyForAssignment: boolean;
  isActive: boolean;

  ownershipType?: OwnershipType;
  vendorId?: number;
  vendorName?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;

  dualMonitor?: boolean;
}

export type OwnershipType = "Owned" | "Rented";

export interface LookupOption {
  id: number;
  name?: string;
  full_name?: string;
}

export interface AssetFormValues {
  assetTag: string;
  assetName: string;
  assetType: AssetType;

  manufacturer: string;
  model: string;
  serialNumber: string;
  hostName: string;

  processor: string;
  ramGb: number | undefined;
  storageGb: number | undefined;
  graphicsCard: string;
  operatingSystem: string;

  departmentId: string;

  purchaseDate: string;
  warrantyExpiry: string;

  remarks: string;

  ownershipType: OwnershipType;
  vendorId: string;
  rentalStartDate: string;
  rentalEndDate: string;

  dualMonitor: boolean;
}

export const OWNERSHIP_TYPES: OwnershipType[] = ["Owned", "Rented"];

export const ASSET_TYPES: AssetType[] = [
  "Desktop",
  "Laptop",
  "Workstation",
  "Server",
];

export const ASSET_STATUSES: AssetStatus[] = [
  "Available",
  "Assigned",
  "Maintenance",
  "Reserved",
  "Retired",
];

export const EMPTY_ASSET_FORM: AssetFormValues = {
  assetTag: "",
  assetName: "",
  assetType: "Workstation",

  manufacturer: "",
  model: "",
  serialNumber: "",
  hostName: "",

  processor: "",
  ramGb: undefined,
  storageGb: undefined,
  graphicsCard: "",
  operatingSystem: "",

  departmentId: "",

  purchaseDate: "",
  warrantyExpiry: "",

  remarks: "",

  ownershipType: "Owned",
  vendorId: "",
  rentalStartDate: "",
  rentalEndDate: "",

  dualMonitor: false,
};
