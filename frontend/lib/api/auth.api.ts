import api from "./client";

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  token: string;
  expiration: string;
  fullName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  companyId: number | null;
  companyName: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<ApiResponse<LoginResponse>>(
    "/auth/login",
    request
  );

  return response.data.data;
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<void> {
  await api.post("/auth/change-password", {
    currentPassword,
    newPassword,
  });
}
