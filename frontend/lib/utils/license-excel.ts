import * as XLSX from "xlsx";
import type { License } from "@/lib/api/licenses.api";

export type PurchasedByValue = "Entity" | "Client";

export interface ImportedLicenseRow {
  aliasCode: string;
  softwareName: string;
  licensedEmail: string;
  subscriptionId: string;
  status: string;
  purchasedBy: PurchasedByValue | "";
  purchaseDate: string;
  expiryDate: string;
  purchaseCost: string;
  remarks: string;
  allowTemporaryCheckout: string;
  maxCheckoutDays: string;
}

function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).trim();
}

function normalizeHeader(header: string): string {
  return header.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function purchasedByLabel(value?: string | null): PurchasedByValue {
  return cellText(value).toLowerCase() === "client" ? "Client" : "Entity";
}

export function resolveImportedPurchasedBy(value: unknown): PurchasedByValue {
  return purchasedByLabel(value);
}

export function resolveImportedAllowCheckout(value: unknown): boolean {
  const text = cellText(value).toLowerCase();
  if (["no", "false", "0", "n", "off"].includes(text)) return false;
  return true;
}

export function resolveImportedMaxCheckoutDays(value: unknown): number {
  const parsed = Number(cellText(value));
  if (!Number.isFinite(parsed) || parsed < 1) return 5;
  return Math.min(365, Math.round(parsed));
}

export function resolveImportedPurchaseCost(value: unknown): number {
  const parsed = Number(cellText(value).replace(/[,₹$]/g, ""));
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

export function exportLicensesToExcel(licenses: License[], fileName = "licenses.xlsx") {
  const rows = licenses.map((item) => ({
    Alias: item.aliasCode,
    Software: item.softwareName,
    "Licensed Email": item.licensedEmail,
    "Subscription ID": item.subscriptionId || "",
    Status: item.status,
    "Purchased By": purchasedByLabel(item.purchasedBy),
    "Purchase Date": item.purchaseDate?.slice(0, 10) || "",
    "Expiry Date": item.expiryDate?.slice(0, 10) || "",
    Cost: item.purchaseCost,
    "Allow Checkout": item.allowTemporaryCheckout ? "Yes" : "No",
    "Max Checkout Days": item.maxCheckoutDays,
    Remarks: item.remarks || "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Licenses");
  XLSX.writeFile(workbook, fileName);
}

const IMPORT_HEADER_ALIASES: Record<keyof ImportedLicenseRow, string[]> = {
  aliasCode: ["alias", "alias code", "license alias"],
  softwareName: ["software", "software name", "product"],
  licensedEmail: ["licensed email", "email", "license email"],
  subscriptionId: ["subscription id", "subscription", "subscriptionid"],
  status: ["status"],
  purchasedBy: ["purchased by", "purchased by type", "buyer", "purchase scope"],
  purchaseDate: ["purchase date", "purchased on"],
  expiryDate: ["expiry date", "expiry", "expires"],
  purchaseCost: ["cost", "purchase cost", "price"],
  remarks: ["remarks", "notes", "comment"],
  allowTemporaryCheckout: ["allow checkout", "allow temporary checkout", "checkout"],
  maxCheckoutDays: ["max checkout days", "maximum checkout days", "checkout days"],
};

function pickField(normalized: Record<string, unknown>, aliases: string[]): string {
  for (const alias of aliases) {
    const text = cellText(normalized[alias]);
    if (text) return text;
  }
  return "";
}

export function mapLicenseExcelRows(rawRows: Record<string, unknown>[]): ImportedLicenseRow[] {
  return rawRows.map((raw) => {
    const normalized: Record<string, unknown> = {};
    Object.entries(raw).forEach(([header, value]) => {
      normalized[normalizeHeader(header)] = value;
    });
    const row = {} as ImportedLicenseRow;
    (Object.keys(IMPORT_HEADER_ALIASES) as (keyof ImportedLicenseRow)[]).forEach((field) => {
      row[field] = pickField(normalized, IMPORT_HEADER_ALIASES[field]);
    });
    row.purchasedBy = row.purchasedBy ? resolveImportedPurchasedBy(row.purchasedBy) : "";
    return row;
  });
}

export async function parseLicensesExcelFile(file: File): Promise<ImportedLicenseRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return mapLicenseExcelRows(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
}

export function downloadLicensesExcelTemplate(fileName = "license-import-template.xlsx") {
  const workbook = XLSX.utils.book_new();
  const licenses = XLSX.utils.json_to_sheet([{
    Alias: "ACAD-001", Software: "AutoCAD", "Licensed Email": "user@example.com",
    "Subscription ID": "", Status: "Available", "Purchased By": "Entity",
    "Purchase Date": "2026-01-15", "Expiry Date": "2027-01-14", Cost: 0,
    "Allow Checkout": "Yes", "Max Checkout Days": 5, Remarks: "",
  }]);
  XLSX.utils.book_append_sheet(workbook, licenses, "Licenses");
  XLSX.writeFile(workbook, fileName);
}
