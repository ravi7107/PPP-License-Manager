import api from "./client";

export interface RoleModuleAccessEntry {
  id: number;
  roleName: string;
  moduleKey: string;
  isAllowed: boolean;
  updatedAt: string | null;
  updatedByUserName: string | null;
}

export interface UpsertRoleModuleAccessRequest {
  roleName: string;
  moduleKey: string;
  isAllowed: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
}

export async function getRoleModuleAccess(): Promise<
  RoleModuleAccessEntry[]
> {
  const response = await api.get<ApiResponse<RoleModuleAccessEntry[]>>(
    "/RoleModuleAccess"
  );

  return response.data.data;
}

export async function upsertRoleModuleAccess(
  request: UpsertRoleModuleAccessRequest
): Promise<RoleModuleAccessEntry> {
  const response = await api.post<ApiResponse<RoleModuleAccessEntry>>(
    "/RoleModuleAccess",
    request
  );

  return response.data.data;
}
