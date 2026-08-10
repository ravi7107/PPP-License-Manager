import * as XLSX from 'xlsx';
import { AssetRecord } from '@/app/pages/hardware/types';

// Exportable asset rows are AssetRecord plus the current-assignment fields
// merged in on the Hardware page (assignedUserName, etc.) — those aren't
// part of the raw /Asset API response, so they're typed loosely here.
type ExportableAsset = AssetRecord & Record<string, unknown>;

const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: 'assetTag', header: 'Asset ID' },
  { key: 'hostName', header: 'Host Name' },
  { key: 'serialNumber', header: 'Serial Number' },
  { key: 'manufacturer', header: 'Manufacturer' },
  { key: 'model', header: 'Model' },
  { key: 'purchaseDate', header: 'Purchase Date' },
  { key: 'warrantyExpiry', header: 'Warranty Expiry' },
  { key: 'assignedUserName', header: 'Current User' },
  { key: 'departmentName', header: 'Department' },
  { key: 'operatingSystem', header: 'Operating System' },
  { key: 'status', header: 'Status' },
];

export function exportAssetsToExcel(assets: ExportableAsset[], fileName = 'asset-inventory.xlsx') {
  const rows = assets.map((asset) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
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
  computerName: string;
  hostName: string;
  serialNumber: string;
  manufacturer: string;
  model: string;
  purchaseDate: string;
  warrantyExpiry: string;
  operatingSystem: string;
  location: string;
  status: string;
}

const IMPORT_HEADER_MAP: Record<string, keyof ImportedAssetRow> = {
  'Asset ID': 'assetTag',
  'Computer Name': 'computerName',
  'Host Name': 'hostName',
  'Serial Number': 'serialNumber',
  Manufacturer: 'manufacturer',
  Model: 'model',
  'Purchase Date': 'purchaseDate',
  'Warranty Expiry': 'warrantyExpiry',
  'Operating System': 'operatingSystem',
  Location: 'location',
  Status: 'status',
};

export async function parseAssetsExcelFile(file: File): Promise<ImportedAssetRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw) => {
    const row: Partial<ImportedAssetRow> = {};
    Object.entries(IMPORT_HEADER_MAP).forEach(([header, field]) => {
      const value = raw[header];
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    });
    return row as ImportedAssetRow;
  });
}
