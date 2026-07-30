import api from './client';

export interface AssetAssignment {
  id: number;

  assetId: number;
  assetTag: string;
  assetName: string;
  hostName: string | null;

  userId: number;
  userName: string;
  employeeCode: string;

  departmentId: number | null;
  departmentName: string | null;

  assignedByUserId: number;
  assignedByUserName: string;

  assignedOn: string;
  returnedOn: string | null;

  status: string;
  remarks: string | null;

  isActive: boolean;
}

export interface AssignAssetRequest {
  assetId: number;
  userId: number;
  remarks?: string | null;
}

export interface TransferAssetRequest {
  newUserId: number;
  remarks?: string | null;
}

export interface ReturnAssetRequest {
  remarks?: string | null;
}


// ============================================================
// CURRENT ASSIGNMENTS
// ============================================================

export async function getCurrentAssetAssignments():
  Promise<AssetAssignment[]> {
  const response =
    await api.get<AssetAssignment[]>(
      '/AssetAssignment/current'
    );

  return response.data;
}


// ============================================================
// ASSIGNMENT BY ID
// ============================================================

export async function getAssetAssignment(
  id: number
): Promise<AssetAssignment> {
  const response =
    await api.get<AssetAssignment>(
      `/AssetAssignment/${id}`
    );

  return response.data;
}


// ============================================================
// ASSET HISTORY
// ============================================================

export async function getAssetAssignmentHistory(
  assetId: number
): Promise<AssetAssignment[]> {
  const response =
    await api.get<AssetAssignment[]>(
      `/AssetAssignment/asset/${assetId}/history`
    );

  return response.data;
}


// ============================================================
// USER ASSIGNMENTS
// ============================================================

export async function getUserAssetAssignments(
  userId: number
): Promise<AssetAssignment[]> {
  const response =
    await api.get<AssetAssignment[]>(
      `/AssetAssignment/user/${userId}`
    );

  return response.data;
}


// ============================================================
// ASSIGN HARDWARE
// ============================================================

export async function assignAsset(
  request: AssignAssetRequest
): Promise<AssetAssignment> {
  const response =
    await api.post<AssetAssignment>(
      '/AssetAssignment/assign',
      request
    );

  return response.data;
}


// ============================================================
// TRANSFER HARDWARE
// ============================================================

export async function transferAsset(
  assignmentId: number,
  request: TransferAssetRequest
): Promise<AssetAssignment> {
  const response =
    await api.post<AssetAssignment>(
      `/AssetAssignment/${assignmentId}/transfer`,
      request
    );

  return response.data;
}


// ============================================================
// RETURN HARDWARE
// ============================================================

export async function returnAsset(
  assignmentId: number,
  request: ReturnAssetRequest = {}
): Promise<void> {
  await api.post(
    `/AssetAssignment/${assignmentId}/return`,
    request
  );
}
