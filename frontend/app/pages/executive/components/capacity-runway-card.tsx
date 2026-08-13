import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CapacityRunwayRow } from '@/app/pages/executive/types';

function recommendationTone(
  recommendation: string
): 'destructive' | 'secondary' | 'outline' {
  if (recommendation.startsWith('Out of free seats') || recommendation.startsWith('Under 4 weeks')) {
    return 'destructive';
  }

  if (recommendation.startsWith('No recent demand')) {
    return 'secondary';
  }

  return 'outline';
}

// Growth & Capacity Planning pillar: per software title, how many free
// seats remain and how fast they're being consumed, projected into an
// estimated runway - flags what needs re-purchasing soon vs what's
// over-bought and a candidate to right-size at the next renewal.
export function CapacityRunwayCard({ rows }: { rows: CapacityRunwayRow[] | unknown }) {
  const safeRows: CapacityRunwayRow[] = Array.isArray(rows) ? rows : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Capacity Runway</CardTitle>
        <CardDescription>
          Free seats vs. 90-day consumption pace, by software - a starting point for purchase planning
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Software</TableHead>
              <TableHead>Free / Total Seats</TableHead>
              <TableHead>Consumed (90d)</TableHead>
              <TableHead>Est. Runway</TableHead>
              <TableHead>Recommendation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {safeRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No license purchase data available.
                </TableCell>
              </TableRow>
            )}
            {safeRows.map((r, index) => (
              <TableRow key={`${r.software_name}-${index}`}>
                <TableCell className="font-medium">{r.software_name}</TableCell>
                <TableCell>
                  {r.free_seats} / {r.total_seats}
                </TableCell>
                <TableCell>{r.seats_consumed_last_90_days}</TableCell>
                <TableCell>
                  {r.estimated_weeks_of_runway !== null
                    ? `${r.estimated_weeks_of_runway}w`
                    : '—'}
                </TableCell>
                <TableCell>
                  <Badge variant={recommendationTone(r.recommendation)} className="whitespace-normal text-left">
                    {r.recommendation}
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
