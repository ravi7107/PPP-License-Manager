import { apiClient, unwrap } from './client';
import { LoginRequest, LoginResponse } from '@/types/api';

// backend/PPS.LicenseManager.API/Controllers/AuthController.cs - wrapped
// in ApiResponse<LoginResponse> (confirmed via a direct curl test
// against a real deployment - not raw as originally assumed here).
// unwrap() handles either shape safely, so this stays correct even if
// a future deployment's wrapping ever differs again.
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiClient.post('/Auth/login', request);
  return unwrap<LoginResponse>(response.data);
}
