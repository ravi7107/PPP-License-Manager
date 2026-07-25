import api from './client';

export interface Client {
  id: number;
  name: string;
  code: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
  licensePurchaseCount: number;
}

export interface CreateClientRequest {
  name: string;
  code: string;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}

export interface UpdateClientRequest
  extends CreateClientRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getClients(): Promise<Client[]> {
  const response =
    await api.get<ApiResponse<Client[]>>('/Client');

  return response.data.data;
}

export async function getClient(
  id: number
): Promise<Client> {
  const response =
    await api.get<ApiResponse<Client>>(
      `/Client/${id}`
    );

  return response.data.data;
}

export async function createClient(
  request: CreateClientRequest
): Promise<Client> {
  const response =
    await api.post<ApiResponse<Client>>(
      '/Client',
      request
    );

  return response.data.data;
}

export async function updateClient(
  id: number,
  request: UpdateClientRequest
): Promise<Client> {
  const response =
    await api.put<ApiResponse<Client>>(
      `/Client/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteClient(
  id: number
): Promise<void> {
  await api.delete(`/Client/${id}`);
}
