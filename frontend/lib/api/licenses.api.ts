import api from "./client";

export interface License {
  id: number;
  aliasCode: string;
  softwareId: number;
  softwareName: string;
  licensedEmail: string;
  subscriptionId: string | null;
  status: string;
  allowTemporaryCheckout: boolean;
  maxCheckoutDays: number;
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: number;
  isActive: boolean;
  remarks: string | null;
}

export interface CreateLicenseRequest {
  aliasCode: string;
  softwareId: number;
  licensedEmail: string;
  subscriptionId?: string | null;
  allowTemporaryCheckout: boolean;
  maxCheckoutDays: number;
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: number;
  remarks?: string | null;
}

export interface UpdateLicenseRequest {
  aliasCode: string;
  softwareId: number;
  licensedEmail: string;
  subscriptionId?: string | null;
  status: string;
  allowTemporaryCheckout: boolean;
  maxCheckoutDays: number;
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: number;
  isActive: boolean;
  remarks?: string | null;
}

export async function getLicenses(): Promise<License[]> {
  const response = await api.get<License[]>(
    "/License"
  );

  return response.data;
}

export async function getLicenseById(
  id: number
): Promise<License> {
  const response = await api.get<License>(
    `/License/${id}`
  );

  return response.data;
}

export async function createLicense(
  request: CreateLicenseRequest
): Promise<License> {
  const response = await api.post<License>(
    "/License",
    request
  );

  return response.data;
}

export async function updateLicense(
  id: number,
  request: UpdateLicenseRequest
): Promise<void> {
  await api.put(
    `/License/${id}`,
    request
  );
}

export async function deleteLicense(
  id: number
): Promise<void> {
  await api.delete(`/License/${id}`);
}
