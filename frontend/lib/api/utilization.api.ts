import api from './client';

/*
 * Software License Utilization & Analytics module - API client.
 *
 * Two response shapes mirror the backend split (see
 * UtilizationUploadController/UtilizationTierSettingsController vs
 * UtilizationAnalysisController): upload/mapping/settings endpoints wrap
 * their payload in the standard ApiResponse envelope (response.data.data),
 * same as role-module-access.api.ts; the read-only analysis endpoints
 * return their DTO directly (response.data), same as analytics.api.ts.
 */

export interface UtilizationUploadBatch {
  id: number;
  softwareId: number | null;
  softwareName: string | null;
  vendorSourceName: string;
  originalFileName: string;
  fileSizeBytes: number;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  status: string;
  totalRowCount: number;
  usableRowCount: number;
  warningRowCount: number;
  companyId: number | null;
  companyName: string | null;
  departmentId: number | null;
  departmentName: string | null;
  uploadedByUserName: string;
  uploadedAt: string;
  processedAt: string | null;
  isActive: boolean;
  duplicateOfBatchId: number | null;
}

export interface UtilizationColumnMappingSuggestion {
  normalizedField: string;
  isRequired: boolean;
  suggestedSourceColumn: string | null;
}

export interface UtilizationUploadPreview {
  batchId: number;
  sourceColumns: string[];
  suggestions: UtilizationColumnMappingSuggestion[];
  sampleRows: Record<string, string | null>[];
  totalRowCount: number;
  matchingMappingProfileId: number | null;
  matchingMappingProfileName: string | null;
}

export interface UtilizationProcessResult {
  batchId: number;
  totalRowCount: number;
  usableRowCount: number;
  warningRowCount: number;
  unusableRowCount: number;
  duplicateRowCount: number;
  unmatchedSoftwareCount: number;
  unmatchedUserCount: number;
  status: string;
}

export interface UtilizationMappingProfile {
  id: number;
  name: string;
  vendorSourceName: string;
  fileFormat: string;
  columnMappings: Record<string, string>;
  softwareId: number | null;
  softwareName: string | null;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface UtilizationOverview {
  hasData: boolean;
  reportingPeriodStart: string | null;
  reportingPeriodEnd: string | null;
  uploadBatchCount: number;
  totalLicenses: number | null;
  totalLicensesUnavailableReason: string | null;
  assignedSeats: number;
  usedSeats: number;
  unusedSeats: number;
  utilizationPct: number | null;
  utilizationPctUnavailableReason: string | null;
  wastagePct: number | null;
  wastagePctUnavailableReason: string | null;
  neverUsedUserCount: number;
  rowsExcludedFromCalculation: number;
  dataCompletenessPct: number;
}

export interface UtilizationTierDistributionRow {
  tier: string;
  userCount: number;
  percentOfAssigned: number;
}

export interface UtilizationDepartmentConcentrationRow {
  departmentLabel: string;
  isMatchedToMaster: boolean;
  heavyCount: number;
  regularCount: number;
  occasionalCount: number;
  lowCount: number;
  inactiveCount: number;
  neverUsedCount: number;
  totalCount: number;
}

export interface UtilizationProductUsageRow {
  softwareLabel: string;
  isMatchedToSoftwareMaster: boolean;
  assignedSeats: number;
  usedSeats: number;
  unusedSeats: number;
  utilizationPct: number | null;
}

export interface UtilizationLeastUsedUserRow {
  displayName: string;
  rawUserIdentifier: string;
  isMatchedToUserMaster: boolean;
  softwareLabel: string;
  departmentLabel: string | null;
  daysUsedInPeriod: number | null;
  lastUsedDate: string | null;
  tier: string;
}

export interface UtilizationUsageDistributionBucket {
  bucketLabel: string;
  userCount: number;
}

export interface UtilizationTierSettings {
  companyId: number | null;
  heavyMinPct: number;
  regularMinPct: number;
  occasionalMinPct: number;
  lowMinPct: number;
  updatedAt: string;
  updatedByUserName: string | null;
}

// ---- Upload / mapping / processing ----

export async function getUtilizationUploads(): Promise<UtilizationUploadBatch[]> {
  const response = await api.get('/UtilizationUpload');
  return response.data.data;
}

export async function getUtilizationMappingProfiles(): Promise<UtilizationMappingProfile[]> {
  const response = await api.get('/UtilizationUpload/mapping-profiles');
  return response.data.data;
}

export interface UploadUtilizationFileParams {
  file: File;
  vendorSourceName: string;
  softwareId?: number | null;
  companyId?: number | null;
  departmentId?: number | null;
  reportingPeriodStart: string;
  reportingPeriodEnd: string;
  mappingProfileId?: number | null;
  forceUpload?: boolean;
}

export async function uploadUtilizationFile(
  params: UploadUtilizationFileParams
): Promise<UtilizationUploadBatch> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('VendorSourceName', params.vendorSourceName);
  formData.append('ReportingPeriodStart', params.reportingPeriodStart);
  formData.append('ReportingPeriodEnd', params.reportingPeriodEnd);
  if (params.softwareId != null) formData.append('SoftwareId', String(params.softwareId));
  if (params.companyId != null) formData.append('CompanyId', String(params.companyId));
  if (params.departmentId != null) formData.append('DepartmentId', String(params.departmentId));
  if (params.mappingProfileId != null) formData.append('MappingProfileId', String(params.mappingProfileId));
  formData.append('ForceUpload', String(params.forceUpload ?? false));

  const response = await api.post('/UtilizationUpload', formData);
  return response.data.data;
}

export async function getUtilizationUploadPreview(batchId: number): Promise<UtilizationUploadPreview> {
  const response = await api.get(`/UtilizationUpload/${batchId}/preview`);
  return response.data.data;
}

export async function saveUtilizationMapping(
  batchId: number,
  columnMappings: Record<string, string>,
  saveAsProfileName?: string | null
): Promise<UtilizationUploadBatch> {
  const response = await api.post(`/UtilizationUpload/${batchId}/mapping`, {
    columnMappings,
    saveAsProfileName: saveAsProfileName || null,
  });
  return response.data.data;
}

export async function processUtilizationUpload(batchId: number): Promise<UtilizationProcessResult> {
  const response = await api.post(`/UtilizationUpload/${batchId}/process`);
  return response.data.data;
}

export async function deactivateUtilizationUpload(batchId: number): Promise<void> {
  await api.delete(`/UtilizationUpload/${batchId}`);
}

export function utilizationUploadFileDownloadUrl(batchId: number): string {
  return `/UtilizationUpload/${batchId}/file`;
}

// ---- Analysis / dashboard ----

function toQuery(params: Record<string, string | number | null | undefined>): string {
  const usable = Object.entries(params).filter(([, v]) => v !== null && v !== undefined);
  if (usable.length === 0) return '';
  return '?' + usable.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export async function getUtilizationOverview(
  softwareId?: number | null, uploadBatchId?: number | null
): Promise<UtilizationOverview> {
  const response = await api.get(
    `/UtilizationAnalysis/overview${toQuery({ softwareId, uploadBatchId })}`
  );
  return response.data;
}

export async function getUtilizationTierDistribution(
  softwareId?: number | null, uploadBatchId?: number | null
): Promise<UtilizationTierDistributionRow[]> {
  const response = await api.get(
    `/UtilizationAnalysis/tier-distribution${toQuery({ softwareId, uploadBatchId })}`
  );
  return response.data;
}

export async function getUtilizationDepartmentConcentration(
  softwareId?: number | null, uploadBatchId?: number | null
): Promise<UtilizationDepartmentConcentrationRow[]> {
  const response = await api.get(
    `/UtilizationAnalysis/department-concentration${toQuery({ softwareId, uploadBatchId })}`
  );
  return response.data;
}

export async function getUtilizationProductUsage(
  softwareId?: number | null, uploadBatchId?: number | null
): Promise<UtilizationProductUsageRow[]> {
  const response = await api.get(
    `/UtilizationAnalysis/product-usage${toQuery({ softwareId, uploadBatchId })}`
  );
  return response.data;
}

export async function getUtilizationLeastUsedUsers(
  softwareId?: number | null, uploadBatchId?: number | null, take = 15
): Promise<UtilizationLeastUsedUserRow[]> {
  const response = await api.get(
    `/UtilizationAnalysis/least-used-users${toQuery({ softwareId, uploadBatchId, take })}`
  );
  return response.data;
}

export async function getUtilizationUsageDistribution(
  softwareId?: number | null, uploadBatchId?: number | null
): Promise<UtilizationUsageDistributionBucket[]> {
  const response = await api.get(
    `/UtilizationAnalysis/usage-distribution${toQuery({ softwareId, uploadBatchId })}`
  );
  return response.data;
}

// ---- Tier settings ----

export async function getUtilizationTierSettings(companyId?: number | null): Promise<UtilizationTierSettings> {
  const response = await api.get(`/UtilizationTierSettings${toQuery({ companyId })}`);
  return response.data.data;
}

export async function updateUtilizationTierSettings(
  settings: Pick<UtilizationTierSettings, 'companyId' | 'heavyMinPct' | 'regularMinPct' | 'occasionalMinPct' | 'lowMinPct'>
): Promise<UtilizationTierSettings> {
  const response = await api.put('/UtilizationTierSettings', settings);
  return response.data.data;
}
