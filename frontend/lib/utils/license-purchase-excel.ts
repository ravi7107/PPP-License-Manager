import * as XLSX from 'xlsx';
import { LicensePurchase } from '@/lib/api/license-purchases.api';

// "Complete" template: every field CreateLicensePurchaseRequest can accept
// (minus the two auto-derived ones, PurchasedByType/PurchaseScope - see
// the comment on resolveImportedPurchaseOwnership below), plus the
// resolved display names the app already has loaded (softwareName,
// companyName, departmentName, clientName) so an exported file reads
// like the on-screen table and can be edited and re-imported as-is.
const EXPORT_COLUMNS: { key: keyof LicensePurchase; header: string }[] = [
  { key: 'softwareName', header: 'Software' },
  { key: 'vendor', header: 'Vendor' },
  { key: 'licenseType', header: 'License Type' },
  { key: 'licenseKey', header: 'License Key' },
  { key: 'totalLicenses', header: 'Total Licenses' },
  { key: 'purchaseDate', header: 'Purchase Date' },
  { key: 'expiryDate', header: 'Expiry Date' },
  { key: 'supportExpiryDate', header: 'Support Expiry Date' },
  { key: 'companyName', header: 'Entity' },
  { key: 'departmentName', header: 'Department' },
  { key: 'clientName', header: 'Client' },
  { key: 'poNumber', header: 'PO Number' },
  { key: 'invoiceNumber', header: 'Invoice Number' },
  { key: 'contractNumber', header: 'Contract Number' },
  { key: 'cost', header: 'Cost' },
  { key: 'currency', header: 'Currency' },
  { key: 'purchaseSource', header: 'Purchase Source' },
  { key: 'remarks', header: 'Remarks' },
];

const EXPORT_HEADERS = EXPORT_COLUMNS.map((c) => c.header);

export function exportLicensePurchasesToExcel(
  purchases: LicensePurchase[],
  fileName = 'license-purchases.xlsx',
) {
  const rows = purchases.map((purchase) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
      if (key === 'purchaseDate' || key === 'expiryDate' || key === 'supportExpiryDate') {
        const value = purchase[key] as string | null | undefined;
        row[header] = value ? value.slice(0, 10) : '';
        return;
      }
      row[header] = purchase[key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'License Purchases');
  XLSX.writeFile(workbook, fileName);
}

export interface ImportedLicensePurchaseRow {
  software: string;
  vendor: string;
  licenseType: string;
  licenseKey: string;
  totalLicenses: string;
  purchaseDate: string;
  expiryDate: string;
  supportExpiryDate: string;
  entity: string;
  department: string;
  client: string;
  poNumber: string;
  invoiceNumber: string;
  contractNumber: string;
  cost: string;
  currency: string;
  purchaseSource: string;
  remarks: string;
}

// Alternate spellings some organizations use for the same field. Each
// field's aliases are grouped together and resolved as one unit (first
// alias with an actual non-blank value wins) - NOT processed as
// independent overwrites - so a spelling the sheet doesn't use can never
// blank out a value a different alias already found. (An earlier version
// of this exact pattern in license-excel.ts had that bug; fixed there,
// and never introduced here in the first place.)
const IMPORT_HEADER_MAP: Record<string, keyof ImportedLicensePurchaseRow> = {
  Software: 'software',
  'Software Name': 'software',
  Vendor: 'vendor',
  'License Type': 'licenseType',
  'License Key': 'licenseKey',
  'Total Licenses': 'totalLicenses',
  Seats: 'totalLicenses',
  'Purchase Date': 'purchaseDate',
  'Expiry Date': 'expiryDate',
  'Support Expiry Date': 'supportExpiryDate',
  'Support Expiry': 'supportExpiryDate',
  Entity: 'entity',
  Company: 'entity',
  Department: 'department',
  Client: 'client',
  'PO Number': 'poNumber',
  'Purchase Batch (PO Number)': 'poNumber',
  'Purchase Batch': 'poNumber',
  'Invoice Number': 'invoiceNumber',
  'Contract Number': 'contractNumber',
  Cost: 'cost',
  'Purchase Cost': 'cost',
  Currency: 'currency',
  'Purchase Source': 'purchaseSource',
  Source: 'purchaseSource',
  Remarks: 'remarks',
};

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

const NORMALIZED_HEADERS_BY_FIELD = (() => {
  const map = new Map<keyof ImportedLicensePurchaseRow, string[]>();
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

export async function parseLicensePurchasesExcelFile(
  file: File,
): Promise<ImportedLicensePurchaseRow[]> {
  const buffer = await file.arrayBuffer();
  // cellDates: true - a genuine Excel date-formatted cell comes through
  // as a real JS Date instead of a raw serial number; the mapping below
  // converts that straight to "YYYY-MM-DD" using UTC getters (see the
  // comment there for why). Plain text cells (including someone's
  // placeholder like "Perpetual" or "NA") are unaffected by this option.
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  return rawRows.map((raw) => {
    const row: Partial<ImportedLicensePurchaseRow> = {};

    const valueByNormalizedHeader = new Map(
      Object.entries(raw).map(([header, value]) => [normalizeHeader(header), value]),
    );

    NORMALIZED_HEADERS_BY_FIELD.forEach((normalizedHeaders, field) => {
      let resolved = '';
      for (const normalizedHeader of normalizedHeaders) {
        const value = valueByNormalizedHeader.get(normalizedHeader);
        if (value !== undefined && value !== null) {
          // SheetJS's cellDates option anchors a real Excel date cell's
          // JS Date using UTC field values (Date.UTC(...) under the
          // hood) - reading it back with .toISOString() + later local
          // getters would silently shift the day for any viewer west of
          // UTC. Read the calendar date with UTC getters right here,
          // while we still know this came from a real date cell, and
          // hand resolveImportedDate an already-unambiguous "YYYY-MM-DD"
          // string instead of a re-parseable timestamp.
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

    return row as ImportedLicensePurchaseRow;
  });
}

// Recognizable placeholder text for "no real date here" - treated the
// same as a blank cell, not as a parse failure, since this is exactly
// the kind of value a real purchase register uses for a perpetual
// license or an unrecorded date.
const NO_DATE_PLACEHOLDER = /^(na|n\/a|none|nil|perpetual|not applicable|unknown|tbd|-|—)$/i;

function formatDateParts(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

// Turns whatever a real spreadsheet has in a date column into
// "YYYY-MM-DD" (what the backend's DateOnly fields need), or null if the
// cell is blank/a placeholder/genuinely unparseable. Handles: a real
// Excel date cell (already reduced to plain "YYYY-MM-DD" text above), a
// bare Excel serial-date number typed as text, a numeric day/month/year
// date, and common human date text ("23 May 2027", "Sunday, May 23,
// 2027") via the browser's own Date parser. Returns null rather than
// throwing - the caller decides whether a null is an error (a required
// date) or just "not provided" (an optional one).
export function resolveImportedDate(raw: string): string | null {
  const text = raw.trim();
  if (!text || NO_DATE_PLACEHOLDER.test(text)) return null;

  // Already an unambiguous plain calendar date (this is exactly what a
  // real Excel date cell resolves to above, and what re-importing this
  // module's own export produces) - return as-is rather than round-
  // tripping through new Date()+getters, which would risk a timezone-
  // dependent day shift for no benefit.
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  // A bare Excel serial number (days since 1899-12-30) typed/read as
  // plain text - only reached when cellDates couldn't apply (e.g. the
  // cell was stored as text/general, not a real date type).
  if (/^\d+(\.\d{1,6})?$/.test(text)) {
    const serial = Number(text);
    if (serial > 59) {
      const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
      const d = new Date(ms);
      if (!Number.isNaN(d.getTime())) {
        return formatDateParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
      }
    }
  }

  // A numeric d/m/y (or d-m-y) date, e.g. "23/05/2027" - this app's own
  // locale is en-IN (day-first), and JS's built-in Date parser either
  // rejects these outright or silently assumes month-first (US
  // convention), which would misread a day-first date. Parse explicitly
  // as day/month/year, swapping only when one side is unambiguously >12
  // (so "05/23/2027", if it ever appears, still resolves correctly).
  const numericMatch = text.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (numericMatch) {
    let day = Number(numericMatch[1]);
    let month = Number(numericMatch[2]);
    let year = Number(numericMatch[3]);
    if (year < 100) year += 2000;
    if (month > 12 && day <= 12) {
      [day, month] = [month, day];
    }
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return formatDateParts(year, month, day);
    }
  }

  const parsed = new Date(text);
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateParts(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }

  return null;
}

// Falls back to 1 (matches emptyPurchaseForm's own default) if blank or
// not a valid positive integer, rather than failing the row outright -
// the caller can still decide this is worth flagging.
export function resolveImportedTotalLicenses(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : null;
}

// Null (not 0) when blank/unparseable - Cost is a genuinely nullable
// field on the backend ("cost not recorded" is a real, different state
// from "cost is zero"), unlike License's PurchaseCost which always has
// a value.
export function resolveImportedCost(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

// PurchasedByType/PurchaseScope aren't spreadsheet columns - the manual
// Add Purchase form derives PurchaseScope automatically from which
// ownership fields are set (see licenses-page.tsx's handlePurchaseSubmit),
// and this mirrors + extends that same derivation to also cover
// PurchasedByType, rather than asking the user to type "Entity"/"Client"
// correctly in a spreadsheet cell.
export function resolveImportedPurchaseOwnership(
  companyId: number | null,
  departmentId: number | null,
  clientId: number | null,
): { purchasedByType: string; purchaseScope: string } {
  if (clientId) {
    return { purchasedByType: 'Client', purchaseScope: 'Client' };
  }
  if (departmentId) {
    return { purchasedByType: 'Entity', purchaseScope: 'Department' };
  }
  return { purchasedByType: 'Entity', purchaseScope: 'Organization' };
}
