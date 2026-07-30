import { Laptop, KeySquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AvailableResource } from '@/app/pages/availability/types';

interface AvailableResourcesTableProps {
  resources: AvailableResource[];
  loading: boolean;
  canRequest: boolean;
  onRequest: (resource: AvailableResource) => void;
}

export function AvailableResourcesTable({ resources, loading, canRequest, onRequest }: AvailableResourcesTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Resource</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Unavailable User</TableHead>
            <TableHead>Window</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                Loading available resources…
              </TableCell>
            </TableRow>
          ) : resources.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                No temporarily available resources right now.
              </TableCell>
            </TableRow>
          ) : (
            resources.map((r) => {
              const key = `${r.resource_type}-${r.asset_id ?? r.license_allocation_id}-${r.unavailability_id}`;
              return (
                <TableRow key={key}>
                  <TableCell>
                    <div className="flex items-center gap-2 font-medium">
                      {r.resource_type === 'Asset' ? (
                        <Laptop className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <KeySquare className="h-4 w-4 text-muted-foreground" />
                      )}
                      {r.resource_label}
                    </div>
                    {r.resource_subtype ? (
                      <div className="ml-6 text-xs text-muted-foreground">
                        {r.resource_subtype}
                      </div>
                    ) : null}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.resource_type}</Badge>
                  </TableCell>
                  <TableCell>{r.user_name}</TableCell>
                  <TableCell className="text-sm">
                    {r.start_date} → {r.end_date}
                  </TableCell>
                  <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">{r.reason}</TableCell>
                  <TableCell className="text-right">
                    {r.pending_request_id ? (
                      <Badge variant="secondary">Request Pending</Badge>
                    ) : canRequest ? (
                      <Button variant="outline" size="sm" onClick={() => onRequest(r)}>
                        Request Reallocation
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
