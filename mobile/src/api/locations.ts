import { apiClient } from './client';
import { OfficeLocationResponse } from '@/types/api';

// GET /OfficeLocation - raw array, not wrapped in ApiResponse (see
// backend Controllers/OfficeLocationController.cs's plain Ok(result)).
export async function getOfficeLocations(): Promise<OfficeLocationResponse[]> {
  const response = await apiClient.get<OfficeLocationResponse[]>(
    '/OfficeLocation'
  );
  return response.data;
}
