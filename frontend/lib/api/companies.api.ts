import api from './client';

export interface Company {
  id: number;
  name: string;
  code: string | null;
  gstNumber: string | null;
  address: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateCompanyRequest {
  name: string;
  code?: string | null;
  gstNumber?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export interface UpdateCompanyRequest extends CreateCompanyRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getCompanies(): Promise<Company[]> {
  const response = await api.get<ApiResponse<Company[]>>('/Company');
  return response.data.data;
}

export async function getCompany(id: number): Promise<Company> {
  const response = await api.get<ApiResponse<Company>>(`/Company/${id}`);
  return response.data.data;
}

export async function createCompany(
  request: CreateCompanyRequest
): Promise<Company> {
  const response = await api.post<ApiResponse<Company>>(
    '/Company',
    request
  );

  return response.data.data;
}

export async function updateCompany(
  id: number,
  request: UpdateCompanyRequest
): Promise<Company> {
  const response = await api.put<ApiResponse<Company>>(
    `/Company/${id}`,
    request
  );

  return response.data.data;
}

export async function deleteCompany(id: number): Promise<void> {
  await api.delete(`/Company/${id}`);
}
