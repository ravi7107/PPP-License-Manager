/**
 * Shapes here are hand-mirrored from the existing PPS backend's C# DTOs -
 * not guessed. Each type notes the exact backend source so a future
 * change to the API is easy to trace back and keep in sync.
 */

// ---------------------------------------------------------------------
// Auth - backend/PPS.LicenseManager.API/DTOs/{Requests/LoginRequest,
// Responses/LoginResponse}.cs, Controllers/AuthController.cs
// ---------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: number;
  token: string;
  expiration: string; // ISO date-time
  fullName: string;
  email: string;
  role: AppRole;
  companyId?: number | null;
  companyName?: string | null;
}

// backend/PPS.LicenseManager.API/Models/Role.cs seed data /
// frontend/lib/auth/roles.ts's AppRole union - single role per user.
export type AppRole =
  | 'Super Admin'
  | 'IT Admin'
  | 'Team Lead'
  | 'Manager'
  | 'Employee';

// What StoredSession persists locally (see lib/auth-context.tsx) - the
// login response minus the token, which lives in SecureStore instead.
export interface StoredUser {
  userId: number;
  fullName: string;
  email: string;
  role: AppRole;
  companyId?: number | null;
  companyName?: string | null;
  expiration: string;
}

// ---------------------------------------------------------------------
// Generic envelope - backend/PPS.LicenseManager.API/Common/ApiResponse.cs
// Not every endpoint uses this wrapper (older ones return raw bodies),
// so api client helpers unwrap it only where the backend actually sends
// it - see src/api/client.ts's `unwrap()`.
// ---------------------------------------------------------------------

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: string[] | null;
}

export interface PagedResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
}

// ---------------------------------------------------------------------
// Asset - backend/PPS.LicenseManager.API/DTOs/Asset/*.cs
// ---------------------------------------------------------------------

export interface AssetResponse {
  id: number;
  assetTag: string;
  assetName: string;
  assetType: string;
  manufacturer?: string | null;
  model?: string | null;
  hostName?: string | null;
  processor?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  graphicsCard?: string | null;
  operatingSystem?: string | null;
  departmentName: string;
  status: string;
  isReadyForAssignment: boolean;
  warrantyExpiry?: string | null;
  isActive: boolean;
  serialNumber?: string | null;
  departmentId: number;
  purchaseDate?: string | null;
  remarks?: string | null;
}

// POST /Asset - existing endpoint, already used by the web app's Asset
// Management form (frontend/app/pages/hardware/components/asset-form-
// dialog.tsx). No new backend surface was added for this - the mobile
// "Add Asset" screen (app/(app)/asset/new.tsx) is a second, deliberately
// narrower client of the same Create action, not a second create path.
// Field names/required-ness mirror DTOs/Asset/CreateAssetRequest.cs
// exactly: AssetTag/AssetName/AssetType/DepartmentId required, everything
// else optional. AssetTag uniqueness is enforced server-side (a 400 with
// a "Asset Tag 'X' already exists." message - see AssetService.CreateAsync
// and Middleware/ExceptionMiddleware.cs's InvalidOperationException
// handling), never re-implemented client-side.
export interface CreateAssetRequest {
  assetTag: string;
  assetName: string;
  assetType: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  hostName?: string | null;
  processor?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  graphicsCard?: string | null;
  operatingSystem?: string | null;
  departmentId: number;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  remarks?: string | null;
}

export interface AssetFilterRequest {
  search?: string;
  departmentId?: number;
  assetType?: string;
  manufacturer?: string;
  status?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface InstalledSoftwareItem {
  softwareId: number;
  softwareName: string;
  version: string;
  licenseKey?: string | null;
  installDate: string;
  status: string;
}

// Returned by GET /Asset/{id}/full-detail AND the new GET
// /Asset/by-code/{code} (wrapped in ApiResponse for the latter) - the
// single richest view of an asset, used for the mobile Asset Details
// screen so a scan never needs a second round-trip.
export interface AssetFullDetailResponse {
  assetId: number;
  assetTag: string;
  assetName: string;
  assetType: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  hostName?: string | null;
  operatingSystem?: string | null;
  processor?: string | null;
  ramGb?: number | null;
  storageGb?: number | null;
  graphicsCard?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  status: string;
  remarks?: string | null;

  departmentId?: number | null;
  departmentName?: string | null;
  companyId?: number | null;
  companyName?: string | null;

  assignmentId?: number | null;
  userId?: number | null;
  userName?: string | null;
  employeeCode?: string | null;
  userEmail?: string | null;
  assignedOn?: string | null;
  workMode?: string | null;

  seatId?: number | null;
  seatCode?: string | null;
  seatName?: string | null;
  floorName?: string | null;
  officeLocationName?: string | null;

  installedSoftware: InstalledSoftwareItem[];
}

// ---------------------------------------------------------------------
// Transfer - backend/PPS.LicenseManager.API/DTOs/AssetAssignment/*.cs,
// Controllers/AssetAssignmentController.cs. Field names/required-ness
// match AssignAssetRequest / TransferAssetRequest / ReturnAssetRequest
// exactly - see mobile/README.md's API-reuse table.
// ---------------------------------------------------------------------

export type AssignmentType = 'Permanent' | 'Temporary';

export interface AssignAssetRequest {
  assetId: number;
  userId: number;
  remarks?: string | null;
  assignmentType?: AssignmentType;
  expectedReturnDate?: string | null;
  seatId?: number | null;
}

export interface TransferAssetRequest {
  newUserId: number;
  remarks?: string | null;
  seatId?: number | null;
}

export interface ReturnAssetRequest {
  remarks?: string | null;
}

export interface AssetAssignmentResponse {
  id: number;
  assetId: number;
  assetTag: string;
  assetName: string;
  hostName?: string | null;
  userId: number;
  userName: string;
  employeeCode: string;
  departmentId?: number | null;
  departmentName?: string | null;
  assignedByUserId: number;
  assignedByUserName: string;
  assignedOn: string;
  returnedOn?: string | null;
  status: string;
  remarks?: string | null;
  isActive: boolean;
  seatId?: number | null;
  seatCode?: string | null;
  seatName?: string | null;
  officeFloorId?: number | null;
  floorName?: string | null;
  officeLocationName?: string | null;
  workMode: string;
}

// ---------------------------------------------------------------------
// Lookups - backend Controllers/{OfficeLocationController,
// DepartmentController,CompanyController,UsersController}.cs
// ---------------------------------------------------------------------

export interface OfficeLocationResponse {
  id: number;
  companyId: number;
  locationCode: string;
  locationName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  isActive: boolean;
}

export interface DepartmentResponse {
  id: number;
  companyId: number;
  departmentCode: string;
  departmentName: string;
  description?: string | null;
  isActive: boolean;
}

export interface CompanyResponse {
  id: number;
  name: string;
  code?: string | null;
  isActive: boolean;
}

export interface UserResponse {
  id: number;
  fullName: string;
  employeeCode: string;
  email: string;
  role: AppRole;
  companyId?: number | null;
  companyName?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  reportsToUserId?: number | null;
  reportsToUserName?: string | null;
  isActive: boolean;
  createdAt: string;
}

// ---------------------------------------------------------------------
// Asset Audit - new module, backend/PPS.LicenseManager.API/DTOs/
// AssetAudit/*.cs, Controllers/AssetAuditController.cs
// ---------------------------------------------------------------------

export type AssetAuditStatus = 'InProgress' | 'Completed' | 'Cancelled';

export type AssetAuditResultState =
  | 'Found'
  | 'Missing'
  | 'Unexpected'
  | 'WrongLocation';

export interface StartAssetAuditRequest {
  locationId: number;
  departmentId?: number | null;
}

export interface RecordAssetAuditScanRequest {
  code: string;
}

export interface CompleteAssetAuditRequest {
  remarks?: string | null;
}

export interface AssetAuditResponse {
  id: number;
  locationId: number;
  locationName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  startedByUserId: number;
  startedByUserName: string;
  startedAt: string;
  status: AssetAuditStatus;
  completedByUserId?: number | null;
  completedByUserName?: string | null;
  completedAt?: string | null;
  expectedCount: number;
  foundCount: number;
  missingCount: number;
  unexpectedCount: number;
  remarks?: string | null;
}

export interface AssetAuditItemResponse {
  id: number;
  assetId: number;
  assetTag: string;
  assetName: string;
  assetType: string;
  isExpected: boolean;
  isScanned: boolean;
  scannedAt?: string | null;
  scannedByUserId?: number | null;
  scannedByUserName?: string | null;
  resultState: AssetAuditResultState;
  remarks?: string | null;
}

export interface AssetAuditDetailResponse {
  audit: AssetAuditResponse;
  items: AssetAuditItemResponse[];
}

export interface AssetAuditScanResponse {
  item: AssetAuditItemResponse;
  wasDuplicate: boolean;
  audit: AssetAuditResponse;
}

// ---------------------------------------------------------------------
// Sanitized API error shape - see src/api/client.ts's error interceptor.
// Backend error bodies vary ({message}, ApiResponse<T> with
// success=false, or ASP.NET's default ProblemDetails for 401/403/500) -
// this is what every screen actually consumes, never the raw body.
// ---------------------------------------------------------------------

export interface ApiError {
  status: number | null;
  message: string;
  isNetworkError: boolean;
}
