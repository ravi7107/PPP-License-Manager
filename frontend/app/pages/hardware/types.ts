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

  // Phase 8 - set only when this asset was created linked to a Purchase
  // Requisition line (see Asset.PurchaseRequisitionId's model comment -
  // linking is always optional). purchaseRequisitionId drives whether the
  // "Sourced from PR" card shows at all; the rest are drawn from that PR's
  // own PO fields (see PurchaseRequisitionService's PO Date/Amount, Phase 6).
  purchaseRequisitionId?: number;
  purchaseRequisitionLineItemId?: number;
  prNumber?: string;
  poNumber?: string;
  poDate?: string;
  poAmount?: number;
  // Summarizes that PR's own invoices (Phase 7) - 0/undefined for an asset
  // with no PR link. Populated by the main asset list (GetAllAsync) and
  // single-asset fetch (GetByIdAsync); left at 0/undefined by the separate
  // paged list endpoint, which this app doesn't use for the Hardware page.
  invoiceCount?: number;
  totalInvoiceAmount?: number;
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

  purchaseRequisitionLineItemId: string;
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

  purchaseRequisitionLineItemId: "",
};
