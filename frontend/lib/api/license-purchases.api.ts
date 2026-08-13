import api from "./client";

export interface LicensePurchase {
  id: number;
  softwareId: number;
  softwareName: string;

  vendor: string;
  licenseType: string;
  licenseKey: string | null;

  totalLicenses: number;
  createdLicenses: number;
  // Quota not yet turned into a license seat-row. Kept for backward
  // compatibility - prefer freeToAllocateLicenses for "can I allocate
  // right now" checks, since a seat can be created but not free
  // (Allocated/Suspended/Expired).
  availableLicenses: number;
  // Already-created seats that are actually free to allocate right now.
  freeToAllocateLicenses: number;

  purchaseDate: string;
  expiryDate: string | null;
  supportExpiryDate: string | null;

  companyId: number | null;
  companyName: string | null;
  departmentId: number | null;
  departmentName: string | null;

  clientId: number | null;
  clientName: string | null;

  purchasedByType: string;
  purchaseScope: string;

  poNumber: string | null;
  invoiceNumber: string | null;
  contractNumber: string | null;

  cost: number | null;
  currency: string | null;

  purchaseSource: string | null;
  remarks: string | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateLicensePurchaseRequest {
  softwareId: number;
  vendor: string;
  licenseType: string;
  licenseKey?: string | null;

  totalLicenses: number;

  purchaseDate: string;
  expiryDate?: string | null;
  supportExpiryDate?: string | null;

  companyId?: number | null;
  departmentId?: number | null;
  clientId?: number | null;

  purchasedByType: string;
  purchaseScope: string;

  poNumber?: string | null;
  invoiceNumber?: string | null;
  contractNumber?: string | null;

  cost?: number | null;
  currency?: string | null;

  purchaseSource?: string | null;
  remarks?: string | null;
}

export interface UpdateLicensePurchaseRequest
  extends CreateLicensePurchaseRequest {
  isActive: boolean;
}

export async function getLicensePurchases(): Promise<
  LicensePurchase[]
> {
  const response = await api.get<LicensePurchase[]>(
    "/LicensePurchase"
  );

  return response.data;
}

export async function getLicensePurchaseById(
  id: number
): Promise<LicensePurchase> {
  const response = await api.get<LicensePurchase>(
    `/LicensePurchase/${id}`
  );

  return response.data;
}

export async function createLicensePurchase(
  request: CreateLicensePurchaseRequest
): Promise<LicensePurchase> {
  const response = await api.post<LicensePurchase>(
    "/LicensePurchase",
    request
  );

  return response.data;
}

export async function updateLicensePurchase(
  id: number,
  request: UpdateLicensePurchaseRequest
): Promise<void> {
  await api.put(
    `/LicensePurchase/${id}`,
    request
  );
}

export async function deleteLicensePurchase(
  id: number
): Promise<void> {
  await api.delete(`/LicensePurchase/${id}`);
}
