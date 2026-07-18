import * as XLSX from 'xlsx';
import { AssetRecord } from '@/app/pages/hardware/types';

const EXPORT_COLUMNS: { key: keyof AssetRecord; header: string }[] = [
  { key: 'asset_tag', header: 'Asset ID' },
  { key: 'computer_name', header: 'Computer Name' },
  { key: 'host_name', header: 'Host Name' },
  { key: 'serial_number', header: 'Serial Number' },
  { key: 'manufacturer', header: 'Manufacturer' },
  { key: 'model', header: 'Model' },
  { key: 'purchase_date', header: 'Purchase Date' },
  { key: 'warranty_expiry', header: 'Warranty Expiry' },
  { key: 'assigned_user_name', header: 'Current User' },
  { key: 'department_name', header: 'Department' },
  { key: 'entity_name', header: 'Entity' },
  { key: 'client_name', header: 'Client' },
  { key: 'operating_system', header: 'Operating System' },
  { key: 'status', header: 'Status' },
  { key: 'location', header: 'Location' },
];

export function exportAssetsToExcel(assets: AssetRecord[], fileName = 'asset-inventory.xlsx') {
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
