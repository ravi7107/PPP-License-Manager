import * as XLSX from 'xlsx';

// "Template" export: a header-only (or filled, if you export existing
// users) sheet matching exactly what the Users bulk import expects -
// mirrors the same "Export doubles as the template" convention already
// used by asset-excel.ts / license-excel.ts. Password is deliberately NOT
// a column here: bulk-imported users share one temporary password entered
// once in the Import dialog itself, rather than sitting in plaintext in a
// spreadsheet per row.
const EXPORT_COLUMNS: { key: string; header: string }[] = [
  { key: 'employeeCode', header: 'Employee Code' },
  { key: 'fullName', header: 'Full Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
  { key: 'companyName', header: 'Entity' },
  { key: 'departmentName', header: 'Department' },
  { key: 'reportsToEmployeeCode', header: 'Reports To (Employee Code)' },
];

const EXPORT_HEADERS = EXPORT_COLUMNS.map((c) => c.header);

export interface ExportableUser {
  employeeCode: string;
  fullName: string;
  email: string;
  role: string;
  companyName: string | null;
  departmentName: string | null;
  reportsToEmployeeCode: string | null;
}

export function exportUsersToExcel(users: ExportableUser[], fileName = 'users-template.xlsx') {
  const rows = users.map((user) => {
    const row: Record<string, unknown> = {};
    EXPORT_COLUMNS.forEach(({ key, header }) => {
      row[header] = (user as unknown as Record<string, unknown>)[key] ?? '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows, { header: EXPORT_HEADERS });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
  XLSX.writeFile(workbook, fileName);
}

export interface ImportedUserRow {
  employeeCode: string;
  fullName: string;
  email: string;
  role: string;
  entity: string;
  department: string;
  reportsToEmployeeCode: string;
}

const IMPORT_HEADER_MAP: Record<string, keyof ImportedUserRow> = {
  'Employee Code': 'employeeCode',
  'Full Name': 'fullName',
  Email: 'email',
  Role: 'role',
  Entity: 'entity',
  Department: 'department',
  'Reports To (Employee Code)': 'reportsToEmployeeCode',
  'Reports To': 'reportsToEmployeeCode',
};

// Trims stray whitespace and ignores case, matching asset-excel.ts's
// normalizeHeader - so a re-typed header like " role " or "ROLE" still
// resolves instead of silently defaulting that whole column for every row.
function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/\s+/g, ' ');
}

export async function parseUsersExcelFile(file: File): Promise<ImportedUserRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  const fieldByNormalizedHeader = new Map(
    Object.entries(IMPORT_HEADER_MAP).map(([header, field]) => [normalizeHeader(header), field]),
  );

  return rawRows.map((raw) => {
    const row: Partial<ImportedUserRow> = {};

    const valueByNormalizedHeader = new Map(
      Object.entries(raw).map(([header, value]) => [normalizeHeader(header), value]),
    );

    fieldByNormalizedHeader.forEach((field, normalizedHeader) => {
      const value = valueByNormalizedHeader.get(normalizedHeader);
      row[field] = value === undefined || value === null ? '' : String(value).trim();
    });

    return row as ImportedUserRow;
  });
}
