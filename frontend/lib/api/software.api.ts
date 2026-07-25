import api from "./client";

export interface Software {
  id: number;
  name: string;
  version: string | null;
  vendor: string;
  category: string;
  licenseType: string;
  isLicenseRequired: boolean;
  description: string | null;
  isActive: boolean;
}

export interface CreateSoftwareRequest {
  name: string;
  version?: string | null;
  vendor: string;
  category: string;
  licenseType: string;
  isLicenseRequired: boolean;
  description?: string | null;
}

export interface UpdateSoftwareRequest {
  name: string;
  version?: string | null;
  vendor: string;
  category: string;
  licenseType: string;
  isLicenseRequired: boolean;
  isActive: boolean;
  description?: string | null;
}

export async function getSoftware(): Promise<Software[]> {
  const response = await api.get<Software[]>("/Software");

  return response.data;
}

export async function getSoftwareById(
  id: number
): Promise<Software> {
  const response = await api.get<Software>(
    `/Software/${id}`
  );

  return response.data;
}

export async function createSoftware(
  request: CreateSoftwareRequest
): Promise<Software> {
  const response = await api.post<Software>(
    "/Software",
    request
  );

  return response.data;
}

export async function updateSoftware(
  id: number,
  request: UpdateSoftwareRequest
): Promise<void> {
  await api.put(
    `/Software/${id}`,
    request
  );
}

export async function deleteSoftware(
  id: number
): Promise<void> {
  await api.delete(`/Software/${id}`);
}
