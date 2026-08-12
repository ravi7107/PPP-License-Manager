import api from './client';

// ============================================================
// OFFICE LOCATIONS
// ============================================================

export interface OfficeLocation {
  id: number;
  companyId: number;
  companyName: string;
  locationCode: string;
  locationName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
  floorCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateOfficeLocationRequest {
  companyId: number;
  locationCode: string;
  locationName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface UpdateOfficeLocationRequest
  extends CreateOfficeLocationRequest {
  isActive: boolean;
}

export async function getOfficeLocations(): Promise<OfficeLocation[]> {
  const response =
    await api.get<OfficeLocation[]>('/OfficeLocation');

  return response.data;
}

export async function getOfficeLocation(
  id: number
): Promise<OfficeLocation> {
  const response =
    await api.get<OfficeLocation>(`/OfficeLocation/${id}`);

  return response.data;
}

export async function getOfficeLocationsByCompany(
  companyId: number
): Promise<OfficeLocation[]> {
  const response =
    await api.get<OfficeLocation[]>(
      `/OfficeLocation/company/${companyId}`
    );

  return response.data;
}

export async function createOfficeLocation(
  request: CreateOfficeLocationRequest
): Promise<OfficeLocation> {
  const response =
    await api.post<OfficeLocation>(
      '/OfficeLocation',
      request
    );

  return response.data;
}

export async function updateOfficeLocation(
  id: number,
  request: UpdateOfficeLocationRequest
): Promise<OfficeLocation> {
  const response =
    await api.put<OfficeLocation>(
      `/OfficeLocation/${id}`,
      request
    );

  return response.data;
}

export async function deleteOfficeLocation(
  id: number
): Promise<void> {
  await api.delete(`/OfficeLocation/${id}`);
}


// ============================================================
// FLOORS
// ============================================================

export interface OfficeFloor {
  id: number;
  officeLocationId: number;
  officeLocationName: string;
  companyId: number;
  companyName: string;
  floorCode: string;
  floorName: string;
  sortOrder: number;

  // Interactive floor map
  mapImagePath: string | null;
  mapOriginalFileName: string | null;
  mapContentType: string | null;
  mapWidth: number | null;
  mapHeight: number | null;

  isActive: boolean;
  seatCount: number;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateOfficeFloorRequest {
  officeLocationId: number;
  floorCode: string;
  floorName: string;
  sortOrder: number;
}

export interface UpdateOfficeFloorRequest
  extends CreateOfficeFloorRequest {
  isActive: boolean;
}

export async function getOfficeFloors(): Promise<OfficeFloor[]> {
  const response =
    await api.get<OfficeFloor[]>(
      '/OfficeLocation/floors'
    );

  return response.data;
}

export async function getOfficeFloorsByLocation(
  officeLocationId: number
): Promise<OfficeFloor[]> {
  const response =
    await api.get<OfficeFloor[]>(
      `/OfficeLocation/${officeLocationId}/floors`
    );

  return response.data;
}

export async function createOfficeFloor(
  request: CreateOfficeFloorRequest
): Promise<OfficeFloor> {
  const response =
    await api.post<OfficeFloor>(
      '/OfficeLocation/floors',
      request
    );

  return response.data;
}

export async function updateOfficeFloor(
  id: number,
  request: UpdateOfficeFloorRequest
): Promise<OfficeFloor> {
  const response =
    await api.put<OfficeFloor>(
      `/OfficeLocation/floors/${id}`,
      request
    );

  return response.data;
}

export async function deleteOfficeFloor(
  id: number
): Promise<void> {
  await api.delete(`/OfficeLocation/floors/${id}`);
}


// ============================================================
// SEATS
// ============================================================

export interface OfficeSeat {
  id: number;
  officeFloorId: number;
  floorCode: string;
  floorName: string;

  officeLocationId: number;
  officeLocationName: string;

  companyId: number;
  companyName: string;

  seatCode: string;
  seatName: string;

  departmentId: number | null;
  departmentName: string | null;

  assetId: number | null;
  assetTag: string | null;
  assetName: string | null;
  hostName: string | null;

  userId: number | null;
  userName: string | null;
  employeeCode: string | null;

  xPosition: number | null;
  yPosition: number | null;

  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
}

export interface CreateOfficeSeatRequest {
  officeFloorId: number;
  seatCode: string;
  seatName: string;
  departmentId?: number | null;
  assetId?: number | null;
  userId?: number | null;
  xPosition?: number | null;
  yPosition?: number | null;
}

export interface UpdateOfficeSeatRequest
  extends CreateOfficeSeatRequest {
  isActive: boolean;
}

export async function getOfficeSeats(): Promise<OfficeSeat[]> {
  const response =
    await api.get<OfficeSeat[]>(
      '/OfficeLocation/seats'
    );

  return response.data;
}

export async function getOfficeSeatsByFloor(
  officeFloorId: number
): Promise<OfficeSeat[]> {
  const response =
    await api.get<OfficeSeat[]>(
      `/OfficeLocation/floors/${officeFloorId}/seats`
    );

  return response.data;
}

export async function createOfficeSeat(
  request: CreateOfficeSeatRequest
): Promise<OfficeSeat> {
  const response =
    await api.post<OfficeSeat>(
      '/OfficeLocation/seats',
      request
    );

  return response.data;
}

export async function updateOfficeSeat(
  id: number,
  request: UpdateOfficeSeatRequest
): Promise<OfficeSeat> {
  const response =
    await api.put<OfficeSeat>(
      `/OfficeLocation/seats/${id}`,
      request
    );

  return response.data;
}

export async function deleteOfficeSeat(
  id: number
): Promise<void> {
  await api.delete(`/OfficeLocation/seats/${id}`);
}


// ============================================================
// FLOOR MAP
// ============================================================

export async function uploadOfficeFloorMap(
  floorId: number,
  file: File
): Promise<OfficeFloor> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<OfficeFloor>(
    `/OfficeLocation/floors/${floorId}/map`,
    formData
  );

  return response.data;
}


// ============================================================
// ASSET FULL DETAIL (office floor map double-click panel)
// ============================================================

export interface InstalledSoftwareItem {
  softwareId: number;
  softwareName: string;
  version: string;
  licenseKey: string | null;
  installDate: string;
  status: string;
}

export interface AssetFullDetail {
  assetId: number;
  assetTag: string;
  assetName: string;
  assetType: string;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  hostName: string | null;
  operatingSystem: string | null;
  processor: string | null;
  ramGb: number | null;
  storageGb: number | null;
  graphicsCard: string | null;
  purchaseDate: string | null;
  warrantyExpiry: string | null;
  status: string;
  remarks: string | null;

  departmentId: number | null;
  departmentName: string | null;
  companyId: number | null;
  companyName: string | null;

  assignmentId: number | null;
  userId: number | null;
  userName: string | null;
  employeeCode: string | null;
  userEmail: string | null;
  assignedOn: string | null;

  // "Office" or "Remote"
  workMode: string | null;

  seatId: number | null;
  seatCode: string | null;
  seatName: string | null;
  floorName: string | null;
  officeLocationName: string | null;

  installedSoftware: InstalledSoftwareItem[];
}

export async function getAssetFullDetail(
  assetId: number
): Promise<AssetFullDetail> {
  const response = await api.get<AssetFullDetail>(
    `/Asset/${assetId}/full-detail`
  );

  return response.data;
}
