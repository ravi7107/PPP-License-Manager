import { apiClient, unwrap } from './client';
import { DepartmentResponse } from '@/types/api';

// GET /Department - wrapped in ApiResponse<T> (see backend
// Controllers/DepartmentController.cs's BaseController.Success()).
export async function getDepartments(): Promise<DepartmentResponse[]> {
  const response = await apiClient.get('/Department');
  return unwrap<DepartmentResponse[]>(response.data);
}
