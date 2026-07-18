import { useEffect, useMemo, useState } from 'react';
import { useLoadAction } from '@/lib/uibakery';
import { Search, FileDown, Sheet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import loadSoftwareOptions from '@/actions/reports/loadSoftwareOptions';
import loadSoftwareUtilizationReport from '@/actions/reports/loadSoftwareUtilizationReport';
import { SoftwareOption, SoftwareUtilizationRow } from '@/app/pages/reports/types';
import { exportRowsToExcel, exportRowsToPdf, ReportColumn } from '@/lib/utils/report-export';

const columns: ReportColumn<SoftwareUtilizationRow>[] = [
  { key: 'entity_name', header: 'Entity' },
  { key: 'department_name', header: 'Department' },
  { key: 'client_name', header: 'Client' },
  { key: 'location', header: 'Location' },
  { key: 'asset_tag', header: 'Asset' },
  { key: 'user_name', header: 'User' },
  { key: 'allocation_date', header: 'Allocated On', format: (v) => (v ? String(v).slice(0, 10) : '—') },
  { key: 'allocation_status', header: 'Status' },
];

// License Utilization drill-down: pick a software title and see every entity, client, and location using it.
export function LicenseUtilizationReport() {
  const [softwareOptions]: [SoftwareOption[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadSoftwareOptions,
    [],
    {},
  );
  const [softwareId, setSoftwareId] = useState<string>('');
  const [softwareName, setSoftwareName] = useState<string>('');

  const [rows, loading, , reload]: [SoftwareUtilizationRow[], boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadSoftwareUtilizationReport, [{ softwareId: softwareId || null }], {}, { enabled: false });

  useEffect(() => {
    if (softwareId) {
      reload();
    }
  }, [softwareId]);

  const summary = useMemo(() => {
    const entities = new Set(rows.map((r) => r.entity_name));
    const clients = new Set(rows.map((r) => r.client_name));
    const locations = new Set(rows.map((r) => r.location));
    return { entities: entities.size, clients: clients.size, locations: locations.size, seats: rows.length };
  }, [rows]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">License Utilization Report</CardTitle>
          <CardDescription>
            Select a software title to see which entities, clients, and locations are utilizing it.
          </CardDescription>
        </div>
        {softwareId && rows.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportRowsToExcel(rows, columns, `license-utilization-${softwareName || 'report'}.xlsx`)}
            >
              <Sheet className="mr-1.5 h-3.5 w-3.5" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportRowsToPdf(
                  `License Utilization - ${softwareName}`,
                  rows,
                  columns,
                  `license-utilization-${softwareName || 'report'}.pdf`,
                )
              }
            >
              <FileDown className="mr-1.5 h-3.5 w-3.5" />
              PDF
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Select
              value={softwareId}
              onValueChange={(value) => {
                setSoftwareId(value);
                setSoftwareName(softwareOptions.find((s) => String(s.id) === value)?.name ?? '');
              }}
            >
              <SelectTrigger className="pl-8">
                <SelectValue placeholder="Select a software title…" />
              </SelectTrigger>
              <SelectContent>
                {softwareOptions.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name} ({s.vendor})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {softwareId ? (
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge variant="outline">{summary.seats} allocation(s)</Badge>
              <Badge variant="outline">{summary.entities} entit{summary.entities === 1 ? 'y' : 'ies'}</Badge>
              <Badge variant="outline">{summary.clients} client(s)</Badge>
              <Badge variant="outline">{summary.locations} location(s)</Badge>
            </div>
          ) : null}
        </div>

        {!softwareId ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Choose a software title above to view its full utilization report.
          </p>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Asset</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Allocated On</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      Loading utilization report…
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                      No active allocations found for this software.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.entity_name}</TableCell>
                      <TableCell>{row.department_name}</TableCell>
                      <TableCell>{row.client_name}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>
                        {row.asset_tag ?? '—'} {row.computer_name ? `(${row.computer_name})` : ''}
                      </TableCell>
                      <TableCell>{row.user_name ?? '—'}</TableCell>
                      <TableCell>{row.allocation_date?.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={row.allocation_status === 'Active' ? 'default' : 'outline'}>
                          {row.allocation_status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
