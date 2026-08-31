import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { isPagedResult } from '@/lib/api/report-center.api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const HIDDEN_KEYS = new Set(['isActive']);

export function humanizeKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^\w/, (char) => char.toUpperCase())
    .trim();
}

export function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? value.toLocaleString('en-IN')
      : value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  if (Array.isArray(value)) return `${value.length} rows`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function recordCountFromResult(result: unknown): number {
  if (isPagedResult(result)) return result.totalRecords;
  if (!result || typeof result !== 'object') return 0;
  const row = result as Record<string, unknown>;
  const counts = ['assetCount', 'licenseCount', 'approvedPurchaseCount']
    .map((key) => (typeof row[key] === 'number' ? (row[key] as number) : 0));
  if (counts.some((value) => value > 0)) return counts.reduce((sum, value) => sum + value, 0);
  return 1;
}

export function ReportPreview({
  result,
  onPageChange,
}: {
  result: unknown;
  onPageChange?: (page: number) => void;
}) {
  if (isPagedResult(result)) {
    const rows = result.items;
    const columns = rows[0]
      ? Object.keys(rows[0]).filter((key) => !HIDDEN_KEYS.has(key))
      : [];

    return (
      <div className="space-y-3">
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} className="whitespace-nowrap text-[11px] uppercase tracking-wide">
                    {humanizeKey(column)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={Math.max(columns.length, 1)} className="py-10 text-center text-sm text-muted-foreground">
                    No records match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, index) => (
                  <TableRow key={index}>
                    {columns.map((column) => (
                      <TableCell key={column} className="whitespace-nowrap text-[13px]">
                        {formatCell(row[column])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between text-[13px] text-muted-foreground">
          <span>
            Page {result.page} of {result.totalPages || Math.max(1, Math.ceil(result.totalRecords / result.pageSize))}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page <= 1}
              onClick={() => onPageChange?.(result.page - 1)}
            >
              <ChevronLeft className="size-3.5" />
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={result.page * result.pageSize >= result.totalRecords}
              onClick={() => onPageChange?.(result.page + 1)}
            >
              Next
              <ChevronRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (result && typeof result === 'object') {
    const row = result as Record<string, unknown>;
    const scalarEntries = Object.entries(row).filter(
      ([, value]) => value === null || ['string', 'number', 'boolean'].includes(typeof value)
    );
    const listEntries = Object.entries(row).filter(([, value]) => Array.isArray(value));

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {scalarEntries.map(([key, value]) => (
            <div key={key} className="rounded-lg border bg-card px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">
                {humanizeKey(key)}
              </div>
              <div className="mt-1 text-lg font-semibold tracking-tight">
                {formatCell(value)}
              </div>
            </div>
          ))}
        </div>
        {listEntries.map(([key, value]) => {
          const rows = value as Record<string, unknown>[];
          const columns = rows[0] ? Object.keys(rows[0]) : [];
          return (
            <div key={key} className="space-y-2">
              <h3 className="text-[13px] font-medium">{humanizeKey(key)}</h3>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {columns.map((column) => (
                        <TableHead key={column}>{humanizeKey(column)}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Math.max(columns.length, 1)} className="py-8 text-center text-sm text-muted-foreground">
                          No breakdown rows.
                        </TableCell>
                      </TableRow>
                    ) : (
                      rows.map((item, index) => (
                        <TableRow key={index}>
                          {columns.map((column) => (
                            <TableCell key={column}>{formatCell(item[column])}</TableCell>
                          ))}
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      Generate the report to preview results.
    </p>
  );
}
