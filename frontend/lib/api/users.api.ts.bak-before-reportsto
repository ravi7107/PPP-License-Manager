import api from "./client";

export interface User {
  id: number;
  fullName: string;
  employeeCode: string;
  email: string;
  role: string;

  companyId: number | null;
  companyName: string | null;

  departmentId: number | null;
  departmentName: string | null;

  isActive: boolean;
  createdAt: string;
}

export interface PagedUsers {
  items: User[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages?: number;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
}

export interface CreateUserRequest {
  fullName: string;
  employeeCode: string;
  email: string;
  password: string;
  roleId: number;

  companyId: number | null;
  departmentId: number | null;

  isActive: boolean;
}

export interface UpdateUserRequest {
  fullName: string;
  employeeCode: string;
  email: string;
  roleId: number;

  companyId: number | null;
  departmentId: number | null;

  isActive: boolean;
}

export async function getUsers(
  search = "",
  page = 1,
  pageSize = 100
): Promise<PagedUsers> {
  const response = await api.get<ApiResponse<PagedUsers>>(
    "/Users",
    {
      params: {
        search: search || undefined,
        page,
        pageSize,
      },
    }
  );

  return response.data.data;
}

export async function createUser(
  request: CreateUserRequest
): Promise<User> {
  const response = await api.post<ApiResponse<User>>(
    "/Users",
    request
  );

  return response.data.data;
}

export async function updateUser(
  id: number,
  request: UpdateUserRequest
): Promise<User> {
  const response = await api.put<ApiResponse<User>>(
    `/Users/${id}`,
    request
  );

  return response.data.data;
}

export async function resetUserPassword(
  id: number,
  newPassword: string
): Promise<void> {
  await api.post(
    `/Users/${id}/reset-password`,
    {
      newPassword,
    }
  );
}
