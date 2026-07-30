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
