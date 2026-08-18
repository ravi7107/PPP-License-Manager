import { apiClient, unwrap } from './client';
import { CompanyResponse } from '@/types/api';

// GET /Company - wrapped in ApiResponse<T>, same pattern as Department.
export async function getCompanies(): Promise<CompanyResponse[]> {
  const response = await apiClient.get('/Company');
  return unwrap<CompanyResponse[]>(response.data);
}
