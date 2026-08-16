import * as XLSX from 'xlsx';
import { AssetRecord } from '@/app/pages/hardware/types';

// Exportable asset rows are AssetRecord plus the current-assignment fields
// merged in on the Hardware page (assignedUserName, etc.) — those aren't
// part of the raw /Asset API response, so they're typed loosely here.
type ExportableAsset = AssetRecord & Record<string, unknown>;

// "Complete" template: every field CreateAssetRequest can accept, so a
// filled-in export can be re-imported as-is to bulk-load real inventory
// data. "Current User" is exported for reference only (it's driven by
// AssetAssignment, not something an asset-creation row can set) and is
// deliberately not in IMPORT_HEADER_MAP below.
const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: 'assetTag', header: 'Asset ID' },
  { key: 'assetName', header: 'Asset Name' },
  { key: 'assetType', header: 'Asset Type' },
  { key: 'companyName', header: 'Entity' },
  { key: 'departmentName', header: 'Department' },
  { key: 'hostName', header: 'Host Name' },
  { key: 'serialNumber', header: 'Serial Number' },
  { key: 'manufacturer', header: 'Manufacturer' },
  { key: 'model', header: 'Model' },
  { key: 'processor', header: 'Processor' },
  { key: 'ramGb', header: 'RAM (GB)' },
  { key: 'storageGb', header: 'Storage (GB)' },
  { key: 'graphicsCard', header: 'Graphics Card' },
  { key: 'purchaseDate', header: 'Purchase Date' },
  { key: 'warrantyExpiry', header: 'Warranty Expiry' },
  { key: 'operatingSystem', header: 'Operating System' },
  { key: 'status', header: 'Status' },
  { key: 'ownershipType', header: 'Ownership Type' },
  { key: 'vendorName', header: 'Vendor' },
  { key: 'rentalStartDate', header: 'Rental Start Date' },
  { key: 'rentalEndDate', header: 'Rental End Date' },
  { key: 'dualMonitorLabel', header: 'Dual Monitor' },
  { key: 'assignedUserName', header: 'Current User' },
];

export function exportAssetsToExcel(assets: ExportableAsset[], fileName = 'asset-inventory.xlsx') {
  const rows = assets.map((asset) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
      if (key === 'dualMonitorLabel') {
        row[header] = asset.dualMonitor ? 'Yes' : 'No';
        return;
      }
      if (key === 'ownershipType') {
        row[header] = asset.ownershipType ?? 'Owned';
        return;
      }
      row[header] = asset[key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Assets');
  XLSX.writeFile(workbook, fileName);
}

export interface ImportedAssetRow {
  assetTag: string;
  assetName: string;
  assetType: string;
  entity: string;
  department: string;
  computerName: string;
  hostName: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  processor: string;
  ramGb: string;
  storageGb: string;
  graphicsCard: string;
  purchaseDate: string;
  warrantyExpiry: string;
  operatingSystem: string;
  location: string;
  status: string;
  ownershipType: string;
  vendor: string;
  rentalStartDate: string;
  rentalEndDate: string;
  dualMonitor: string;
}

const IMPORT_HEADER_MAP: Record<string, keyof ImportedAssetRow> = {
  'Asset ID': 'assetTag',
  'Asset Name': 'assetName',
  'Asset Type': 'assetType',
  Entity: 'entity',
  Department: 'department',
  'Computer Name': 'computerName',
  'Host Name': 'hostName',
  'Serial Number': 'serialNumber',
  Manufacturer: 'manufacturer',
  Model: 'model',
  Processor: 'processor',
  'RAM (GB)': 'ramGb',
  'Storage (GB)': 'storageGb',
  'Graphics Card': 'graphicsCard',
  'Purchase Date': 'purchaseDate',
  'Warranty Expiry': 'warrantyExpiry',
  'Operating System': 'operatingSystem',
  Location: 'location',
  Status: 'status',
  'Ownership Type': 'ownershipType',
  Vendor: 'vendor',
  'Rental Start Date': 'rentalStartDate',
  'Rental End Date': 'rentalEndDate',
  'Dual Monitor': 'dualMonitor',
};

export const IMPORT_ASSET_TYPES = ['Desktop', 'Laptop', 'Workstation', 'Server'] as const;

// Trims stray whitespace and ignores case, so a header like " ownership
// type " or "OWNERSHIP TYPE" (someone re-typing headers by hand instead
// of using the exported template as-is) still resolves instead of
// silently defaulting that whole column for every row.
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function parseAssetsExcelFile(file: File): Promise<ImportedAssetRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const fieldByNormalizedHeader = new Map(
    Object.entries(IMPORT_HEADER_MAP).map(([header, field]) => [normalizeHeader(header), field]),
  );

  return rawRows.map((raw) => {
    const row: Partial<ImportedAssetRow> = {};

    const valueByNormalizedHeader = new Map(
      Object.entries(raw).map(([header, value]) => [normalizeHeader(header), value]),
    );

    fieldByNormalizedHeader.forEach((field, normalizedHeader) => {
      const value = valueByNormalizedHeader.get(normalizedHeader);
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    });

    return row as ImportedAssetRow;
  });
}

// AssetName and AssetType are required by the backend (CreateAssetRequest)
// but real-world spreadsheets don't always have a dedicated "Asset Name"
// or "Asset Type" column filled in - these resolve a usable value rather
// than failing the row, matching how the row would look if someone filled
// the Add Asset form by hand with only what they had.
export function resolveImportedAssetName(row: ImportedAssetRow): string {
  return row.assetName || row.computerName || row.hostName || row.assetTag;
}

export function resolveImportedAssetType(row: ImportedAssetRow): (typeof IMPORT_ASSET_TYPES)[number] {
  const match = IMPORT_ASSET_TYPES.find(
    (t) => t.toLowerCase() === row.assetType.toLowerCase(),
  );
  return match ?? 'Workstation';
}

// "Owned" unless the column clearly says otherwise - matches the
// Add/Edit Asset form's own default.
export function resolveImportedOwnershipType(row: ImportedAssetRow): 'Owned' | 'Rented' {
  return row.ownershipType.trim().toLowerCase() === 'rented' ? 'Rented' : 'Owned';
}

// "No" (single monitor) unless the column clearly says "Yes" - matches
// the Add/Edit Asset form's own default.
export function resolveImportedDualMonitor(row: ImportedAssetRow): boolean {
  return row.dualMonitor.trim().toLowerCase() === 'yes';
}

// RAM/Storage come in as free-text cells (Excel numbers still arrive as
// strings by the time they reach ImportedAssetRow) - parse to a whole
// number of GB, or undefined if blank/not a number, so a bad cell
// doesn't crash the row.
export function resolveImportedGb(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}
