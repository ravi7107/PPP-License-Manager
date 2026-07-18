import { FileDown, Sheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from '@/components/ui/table';
import { exportRowsToExcel, exportRowsToPdf, ReportColumn } from '@/lib/utils/report-export';

export function ReportTableCard<T>({
  title,
  description,
  rows,
  columns,
  render,
  loading,
  fileBaseName,
  extra,
}: {
  title: string;
  description?: string;
  rows: T[];
  columns: ReportColumn<T>[];
  render?: (row: T, col: ReportColumn<T>) => React.ReactNode;
  loading?: boolean;
  fileBaseName: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {extra}
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => exportRowsToExcel(rows, columns, `${fileBaseName}.xlsx`)}
          >
            <Sheet className="mr-1.5 h-3.5 w-3.5" />
            Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={rows.length === 0}
            onClick={() => exportRowsToPdf(title, rows, columns, `${fileBaseName}.pdf`)}
          >
            <FileDown className="mr-1.5 h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={String(col.key)}>{col.header}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="py-8 text-center text-sm text-muted-foreground">
                    No data available.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row, idx) => (
                  <TableRow key={idx}>
                    {columns.map((col) => (
                      <TableCell key={String(col.key)}>
                        {render ? render(row, col) : col.format ? col.format(row[col.key], row) : String(row[col.key] ?? '—')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
