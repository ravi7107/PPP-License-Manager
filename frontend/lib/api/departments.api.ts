import api from './client';

export interface Department {
  id: number;
  companyId: number;
  companyName: string;
  departmentCode: string;
  departmentName: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateDepartmentRequest {
  companyId: number;
  departmentCode: string;
  departmentName: string;
  description?: string | null;
}

export interface UpdateDepartmentRequest
  extends CreateDepartmentRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getDepartments(): Promise<Department[]> {
  const response =
    await api.get<ApiResponse<Department[]>>('/Department');

  return response.data.data;
}

export async function getDepartment(
  id: number
): Promise<Department> {
  const response =
    await api.get<ApiResponse<Department>>(
      `/Department/${id}`
    );

  return response.data.data;
}

export async function createDepartment(
  request: CreateDepartmentRequest
): Promise<Department> {
  const response =
    await api.post<ApiResponse<Department>>(
      '/Department',
      request
    );

  return response.data.data;
}

export async function updateDepartment(
  id: number,
  request: UpdateDepartmentRequest
): Promise<Department> {
  const response =
    await api.put<ApiResponse<Department>>(
      `/Department/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteDepartment(
  id: number
): Promise<void> {
  await api.delete(`/Department/${id}`);
}
