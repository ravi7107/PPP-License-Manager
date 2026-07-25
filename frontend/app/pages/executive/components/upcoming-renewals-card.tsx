import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UpcomingRenewalRow } from '@/app/pages/executive/types';

function renewalTone(days: number | null): 'destructive' | 'secondary' | 'outline' {
  if (days === null) return 'outline';
  if (days < 0) return 'destructive';
  if (days <= 30) return 'destructive';
  if (days <= 60) return 'secondary';
  return 'outline';
}

export function UpcomingRenewalsCard({ rows }: { rows: UpcomingRenewalRow[] | unknown }) {
  const safeRows: UpcomingRenewalRow[] = Array.isArray(rows) ? rows : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Renewals</CardTitle>
        <CardDescription>License pools expiring within 90 days, nearest first</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Software</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Seats</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Expiry</TableHead>
              <TableHead className="text-right">Days Left</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No renewals due in the next 90 days.
                </TableCell>
              </TableRow>
            )}
            {safeRows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium">
                  {r.software_name}
                  <div className="text-xs text-muted-foreground">{r.vendor ?? '—'}</div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{r.entity_name ?? r.client_name ?? '—'}</TableCell>
                <TableCell>{r.total_seats}</TableCell>
                <TableCell>₹{Number(r.cost ?? 0).toLocaleString('en-IN')}</TableCell>
                <TableCell>{r.expiry_date ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={renewalTone(r.days_to_expiry)}>
                    {r.days_to_expiry !== null ? (r.days_to_expiry < 0 ? `${Math.abs(r.days_to_expiry)}d overdue` : `${r.days_to_expiry}d`) : '—'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
