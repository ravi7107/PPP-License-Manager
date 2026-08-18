import api from './client';

export interface Vendor {
  id: number;
  vendorCode: string;
  vendorName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  // GST Identification Number - optional, shown on the Purchase
  // Requisition PDF's Vendor Information section when set.
  gstin: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateVendorRequest {
  vendorCode: string;
  vendorName: string;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  gstin?: string | null;
  isActive: boolean;
}

export interface UpdateVendorRequest extends CreateVendorRequest {}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getVendors(): Promise<Vendor[]> {
  const response = await api.get<ApiResponse<Vendor[]>>('/Vendor');

  return response.data.data;
}

export async function getVendor(id: number): Promise<Vendor> {
  const response = await api.get<ApiResponse<Vendor>>(`/Vendor/${id}`);

  return response.data.data;
}

export async function createVendor(
  request: CreateVendorRequest
): Promise<Vendor> {
  const response = await api.post<ApiResponse<Vendor>>('/Vendor', request);

  return response.data.data;
}

export async function updateVendor(
  id: number,
  request: UpdateVendorRequest
): Promise<Vendor> {
  const response = await api.put<ApiResponse<Vendor>>(
    `/Vendor/${id}`,
    request
  );

  return response.data.data;
}

export async function deleteVendor(id: number): Promise<void> {
  await api.delete(`/Vendor/${id}`);
}
