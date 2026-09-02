import { apiClient, unwrap } from './client';
import { VendorResponse } from '@/types/api';

// GET /Vendor - open to any authenticated user (Controllers/
// VendorController.cs's GetAll has no extra role restriction, only
// Create/Update/Delete are Super Admin/IT Admin-gated), same pattern as
// companies.ts. Feeds the Rental "Vendor" picker on Add Asset (Extension
// 4, Phase 22) - no new backend surface needed.
export async function getVendors(): Promise<VendorResponse[]> {
  const response = await apiClient.get('/Vendor');
  return unwrap<VendorResponse[]>(response.data);
}
