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

// Explicit header list (rather than letting json_to_sheet infer columns
// from rows[0]) so exporting with zero rows still writes a header-only
// template instead of a completely blank sheet.
const EXPORT_HEADERS = EXPORT_COLUMNS.map((c) => c.header);

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

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
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

// Several IMPORT_HEADER_MAP entries are alternate spellings for the same
// field (e.g. "Software" / "Software Name", or "Purchase Batch (PO
// Number)" / "PO Number" / "Purchase Batch") - a sheet normally only uses
// one spelling. Group the normalized header aliases by the field they
// resolve to, so every alias for a field gets a chance to supply a value
// instead of the last-processed alias unconditionally overwriting
// whatever an earlier one already found.
const NORMALIZED_HEADERS_BY_FIELD = (() => {
  const map = new Map<keyof ImportedLicenseRow, string[]>();
  Object.entries(IMPORT_HEADER_MAP).forEach(([header, field]) => {
    const normalized = normalizeHeader(header);
    const existing = map.get(field);
    if (existing) {
      existing.push(normalized);
    } else {
      map.set(field, [normalized]);
    }
  });
  return map;
})();

export async function parseLicensesExcelFile(file: File): Promise<ImportedLicenseRow[]> {
  const buffer = await file.arrayBuffer();
  // cellDates: true - a genuine Excel date-formatted cell (Purchase Date /
  // Expiry Date, when the sheet actually typed those as dates rather than
  // plain text) comes through as a real JS Date instead of a raw serial
  // number like 46165 - without this option, that serial number gets
  // stringified as-is below and sent to the backend's DateTime field,
  // which correctly rejects it ("could not be converted to
  // System.DateTime"). Plain text cells are unaffected by this option.
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw) => {
    const row: Partial<ImportedLicenseRow> = {};

    const valueByNormalizedHeader = new Map(
      Object.entries(raw).map(([header, value]) => [normalizeHeader(header), value]),
    );

    NORMALIZED_HEADERS_BY_FIELD.forEach((normalizedHeaders, field) => {
      // First alias with an actual non-blank value wins; if none of this
      // field's alias headers are present (or all are blank), the field
      // is blank - same end result as before for a sheet that only ever
      // uses one spelling, but no longer clobbered by a spelling the
      // sheet doesn't use at all.
      let resolved = '';
      for (const normalizedHeader of normalizedHeaders) {
        const value = valueByNormalizedHeader.get(normalizedHeader);
        if (value !== undefined && value !== null) {
          // SheetJS's cellDates option anchors a real Excel date cell's
          // JS Date using UTC field values - reading it back with
          // .toISOString() + later local getters would silently shift
          // the day for any viewer west of UTC. Read the calendar date
          // with UTC getters right here, while we still know this came
          // from a real date cell, converting straight to plain
          // "YYYY-MM-DD" text (same fix already used in
          // license-purchase-excel.ts's own importer).
          const text =
            value instanceof Date
              ? `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`
              : String(value).trim();
          if (text !== '') {
            resolved = text;
            break;
          }
        }
      }
      row[field] = resolved;
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
