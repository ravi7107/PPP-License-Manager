import * as XLSX from 'xlsx';
import { SoftwareInventoryRecord } from '@/app/pages/licenses/types';

const EXPORT_COLUMNS: { key: keyof SoftwareInventoryRecord; header: string }[] = [
  { key: 'software_name', header: 'Software Name' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'version', header: 'Version' },
  { key: 'license_type', header: 'License Type' },
  { key: 'license_count', header: 'Total Licenses' },
  { key: 'used_licenses', header: 'Used Licenses' },
  { key: 'available_licenses', header: 'Available Licenses' },
  { key: 'cost_per_license', header: 'Cost Per License' },
  { key: 'total_cost', header: 'Total Cost' },
  { key: 'expiry_date', header: 'Expiry Date' },
  { key: 'maintenance_expiry', header: 'Maintenance Expiry' },
  { key: 'entity_name', header: 'Entity' },
  { key: 'department_name', header: 'Department' },
  { key: 'client_name', header: 'Client' },
  { key: 'status', header: 'Status' },
];

export function exportSoftwareToExcel(records: SoftwareInventoryRecord[], fileName = 'software-licenses.xlsx') {
  const rows = records.map((record) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
      row[header] = record[key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Software Licenses');
  XLSX.writeFile(workbook, fileName);
}

export interface ImportedSoftwareRow {
  softwareName: string;
  vendor: string;
  version: string;
  licenseType: string;
  licenseCount: string;
  costPerLicense: string;
  expiryDate: string;
  maintenanceExpiry: string;
  status: string;
}

const IMPORT_HEADER_MAP: Record<string, keyof ImportedSoftwareRow> = {
  'Software Name': 'softwareName',
  Vendor: 'vendor',
  Version: 'version',
  'License Type': 'licenseType',
  'Total Licenses': 'licenseCount',
  'Cost Per License': 'costPerLicense',
  'Expiry Date': 'expiryDate',
  'Maintenance Expiry': 'maintenanceExpiry',
  Status: 'status',
};

export async function parseSoftwareExcelFile(file: File): Promise<ImportedSoftwareRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw) => {
    const row: Partial<ImportedSoftwareRow> = {};
    Object.entries(IMPORT_HEADER_MAP).forEach(([header, field]) => {
      const value = raw[header];
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    });
    return row as ImportedSoftwareRow;
  });
}
