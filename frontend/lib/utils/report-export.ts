import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportColumn<T> {
  key: keyof T;
  header: string;
  format?: (value: T[keyof T], row: T) => string | number;
}

function formatCell<T>(row: T, column: ReportColumn<T>): string | number {
  const raw = row[column.key];
  if (column.format) return column.format(raw, row);
  if (raw === null || raw === undefined) return '';
  return raw as unknown as string | number;
}

export function exportRowsToExcel<T>(rows: T[], columns: ReportColumn<T>[], fileName: string, sheetName = 'Report') {
  const data = rows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((col) => {
      record[col.header] = formatCell(row, col);
    });
    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, fileName);
}

export function exportRowsToPdf<T>(title: string, rows: T[], columns: ReportColumn<T>[], fileName: string) {
  const doc = new jsPDF({ orientation: columns.length > 5 ? 'landscape' : 'portrait' });
  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 21);

  autoTable(doc, {
    startY: 26,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((col) => String(formatCell(row, col)))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59] },
  });

  doc.save(fileName);
}
