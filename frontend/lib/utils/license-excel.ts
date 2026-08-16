import * as XLSX from 'xlsx';
import { License } from '@/lib/api/licenses.api';

// Exportable license rows are License plus the display-name fields
// resolved on the Licenses page (softwareName is already on License;
// purchasePoNumber is looked up from the matching LicensePurchase) -
// those extras aren't part of the raw /License API response, so they're
// typed loosely here, matching the pattern in asset-excel.ts.
type ExportableLicense = License & Record<string, unknown>;

// "Complete" template: every field CreateLicenseRequest can accept, so a
// filled-in export can be re-imported as-is to bulk-load real license
// inventory data. Status isn't included - a newly created license always
// starts "Available" (matches the Add License form's own behavior; the
// Status field there only appears when editing).
const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: 'aliasCode', header: 'Alias Code' },
  { key: 'softwareName', header: 'Software' },
  { key: 'purchasePoNumber', header: 'Purchase Batch (PO Number)' },
  { key: 'licensedEmail', header: 'Licensed Email' },
  { key: 'subscriptionId', header: 'Subscription ID' },
  { key: 'purchaseDate', header: 'Purchase Date' },
  { key: 'expiryDate', header: 'Expiry Date' },
  { key: 'purchaseCost', header: 'Purchase Cost' },
  { key: 'allowCheckoutLabel', header: 'Allow Temporary Checkout' },
  { key: 'maxCheckoutDays', header: 'Max Checkout Days' },
  { key: 'status', header: 'Status' },
  { key: 'remarks', header: 'Remarks' },
];

export function exportLicensesToExcel(licenses: ExportableLicense[], fileName = 'license-inventory.xlsx') {
  const rows = licenses.map((license) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
      if (key === 'allowCheckoutLabel') {
        row[header] = license.allowTemporaryCheckout ? 'Yes' : 'No';
        return;
      }
      if (key === 'purchaseDate' || key === 'expiryDate') {
        const value = license[key] as string | null | undefined;
        row[header] = value ? value.slice(0, 10) : '';
        return;
      }
      row[header] = license[key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Licenses');
  XLSX.writeFile(workbook, fileName);
}

export interface ImportedLicenseRow {
  aliasCode: string;
  software: string;
  purchasePoNumber: string;
  licensedEmail: string;
  subscriptionId: string;
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: string;
  allowCheckout: string;
  maxCheckoutDays: string;
  remarks: string;
}

const IMPORT_HEADER_MAP: Record<string, keyof ImportedLicenseRow> = {
  'Alias Code': 'aliasCode',
  Software: 'software',
  'Software Name': 'software',
  'Purchase Batch (PO Number)': 'purchasePoNumber',
  'PO Number': 'purchasePoNumber',
  'Purchase Batch': 'purchasePoNumber',
  'Licensed Email': 'licensedEmail',
  'Subscription ID': 'subscriptionId',
  'Purchase Date': 'purchaseDate',
  'Expiry Date': 'expiryDate',
  'Purchase Cost': 'purchaseCost',
  'Allow Temporary Checkout': 'allowCheckout',
  'Max Checkout Days': 'maxCheckoutDays',
  Remarks: 'remarks',
};

// Trims stray whitespace and ignores case, so a header like " software "
// or "SOFTWARE" (someone re-typing headers by hand instead of using the
// exported template as-is) still resolves - same convention as
// asset-excel.ts's normalizeHeader.
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function parseLicensesExcelFile(file: File): Promise<ImportedLicenseRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const fieldByNormalizedHeader = new Map(
    Object.entries(IMPORT_HEADER_MAP).map(([header, field]) => [normalizeHeader(header), field]),
  );

  return rawRows.map((raw) => {
    const row: Partial<ImportedLicenseRow> = {};

    const valueByNormalizedHeader = new Map(
      Object.entries(raw).map(([header, value]) => [normalizeHeader(header), value]),
    );

    fieldByNormalizedHeader.forEach((field, normalizedHeader) => {
      const value = valueByNormalizedHeader.get(normalizedHeader);
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    });

    return row as ImportedLicenseRow;
  });
}

// "Yes" (allowed) unless the column clearly says otherwise - matches the
// Add License form's own default.
export function resolveImportedAllowCheckout(row: ImportedLicenseRow): boolean {
  const trimmed = row.allowCheckout.trim().toLowerCase();
  return trimmed === '' || trimmed === 'yes' || trimmed === 'true';
}

// Falls back to the form's own default (5) if blank or not a valid
// number, rather than failing the row.
export function resolveImportedMaxCheckoutDays(row: ImportedLicenseRow): number {
  const trimmed = row.maxCheckoutDays.trim();
  if (!trimmed) return 5;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

// Falls back to 0 (matches EMPTY_LICENSE's own default) if blank or not
// a valid number.
export function resolveImportedPurchaseCost(row: ImportedLicenseRow): number {
  const trimmed = row.purchaseCost.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}
