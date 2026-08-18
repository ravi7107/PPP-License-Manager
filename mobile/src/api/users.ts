import { apiClient, unwrap } from './client';
import { PagedResponse, UserResponse } from '@/types/api';

/**
 * GET /Users?search=&page=&pageSize= - wrapped in
 * ApiResponse<PagedResponse<UserResponse>>. Gated to Super Admin/IT
 * Admin server-side (backend Controllers/UsersController.cs), the
 * same roles this app gates Transfer to (see app/(app)/asset/[id]/
 * transfer.tsx) - so any user allowed to transfer an asset is also
 * allowed to call this. Used for the Transfer screen's "Assign To"
 * picker, exactly like the existing web Transfer dialog.
 */
export async function searchUsers(
  search: string,
  page = 1,
  pageSize = 20
): Promise<PagedResponse<UserResponse>> {
  const response = await apiClient.get('/Users', {
    params: { search, page, pageSize },
  });
  return unwrap<PagedResponse<UserResponse>>(response.data);
}
