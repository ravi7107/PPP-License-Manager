import api from './client';

export interface MaterialApprovalWorkflowStep {
  id: number;
  stepOrder: number;
  approverType: string;
  approverRole: string | null;
  approverUserId: number | null;
  approverUserName: string | null;
  approverDepartmentId: number | null;
  approverDepartmentName: string | null;
  isMandatory: boolean;
}

export interface MaterialApprovalWorkflow {
  id: number;
  name: string;
  movementType: string | null;
  minValue: number | null;
  maxValue: number | null;
  fromCompanyId: number | null;
  fromCompanyName: string | null;
  toCompanyId: number | null;
  toCompanyName: string | null;
  // null matches regardless; true/false requires the movement to (not)
  // carry a line item linked to a serialized IT asset.
  requiresItAssetLine: boolean | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string | null;
  steps: MaterialApprovalWorkflowStep[];
}

// InternalTransfer, InterEntityTransfer, OutwardToVendor, InwardFromVendor,
// TemporaryMovement, DirectInward, DirectOutward - must match
// MaterialMovement.cs's doc comment on the backend exactly.
export const MOVEMENT_TYPES = [
  'InternalTransfer',
  'InterEntityTransfer',
  'OutwardToVendor',
  'InwardFromVendor',
  'TemporaryMovement',
  'DirectInward',
  'DirectOutward',
] as const;

// Must match MaterialApprovalWorkflowService.AllowedApproverRoles on the
// backend, which in turn must match the Roles table / AppRole names
// (lib/auth/roles.ts).
export const APPROVER_ROLES = [
  'Super Admin',
  'IT Admin',
  'Team Lead',
  'Manager',
  'Employee',
] as const;

export const APPROVER_TYPES = ['Role', 'User', 'Department'] as const;

export interface CreateMaterialApprovalWorkflowStepRequest {
  approverType: string;
  approverRole?: string | null;
  approverUserId?: number | null;
  approverDepartmentId?: number | null;
  isMandatory: boolean;
}

export interface CreateMaterialApprovalWorkflowRequest {
  name: string;
  movementType?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  fromCompanyId?: number | null;
  toCompanyId?: number | null;
  requiresItAssetLine?: boolean | null;
  priority: number;
  steps: CreateMaterialApprovalWorkflowStepRequest[];
}

export interface UpdateMaterialApprovalWorkflowRequest
  extends CreateMaterialApprovalWorkflowRequest {
  isActive: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
}

export async function getMaterialApprovalWorkflows(): Promise<
  MaterialApprovalWorkflow[]
> {
  const response =
    await api.get<ApiResponse<MaterialApprovalWorkflow[]>>(
      '/MaterialApprovalWorkflow'
    );

  return response.data.data;
}

export async function getMaterialApprovalWorkflow(
  id: number
): Promise<MaterialApprovalWorkflow> {
  const response =
    await api.get<ApiResponse<MaterialApprovalWorkflow>>(
      `/MaterialApprovalWorkflow/${id}`
    );

  return response.data.data;
}

export async function createMaterialApprovalWorkflow(
  request: CreateMaterialApprovalWorkflowRequest
): Promise<MaterialApprovalWorkflow> {
  const response =
    await api.post<ApiResponse<MaterialApprovalWorkflow>>(
      '/MaterialApprovalWorkflow',
      request
    );

  return response.data.data;
}

export async function updateMaterialApprovalWorkflow(
  id: number,
  request: UpdateMaterialApprovalWorkflowRequest
): Promise<MaterialApprovalWorkflow> {
  const response =
    await api.put<ApiResponse<MaterialApprovalWorkflow>>(
      `/MaterialApprovalWorkflow/${id}`,
      request
    );

  return response.data.data;
}

export async function deleteMaterialApprovalWorkflow(
  id: number
): Promise<void> {
  await api.delete(`/MaterialApprovalWorkflow/${id}`);
}
