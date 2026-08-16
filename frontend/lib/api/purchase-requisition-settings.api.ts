import api from './client';

export interface PurchaseRequisitionSettings {
  financeNotificationEmail: string | null;
  updatedAt: string | null;
  updatedByUserName: string | null;
}

export interface UpdatePurchaseRequisitionSettingsRequest {
  financeNotificationEmail?: string | null;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getPurchaseRequisitionSettings(): Promise<
  PurchaseRequisitionSettings
> {
  const response = await api.get<ApiResponse<PurchaseRequisitionSettings>>(
    '/PurchaseRequisitionSettings'
  );

  return response.data.data;
}

export async function updatePurchaseRequisitionSettings(
  request: UpdatePurchaseRequisitionSettingsRequest
): Promise<PurchaseRequisitionSettings> {
  const response = await api.put<ApiResponse<PurchaseRequisitionSettings>>(
    '/PurchaseRequisitionSettings',
    request
  );

  return response.data.data;
}
