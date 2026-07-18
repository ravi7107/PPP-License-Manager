import { KeySquare, Monitor } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SoftwareSearchResult } from '@/app/pages/search/types';

export function SoftwareResultCard({ result }: { result: SoftwareSearchResult }) {
  const availableSeats = Math.max(result.total_seats - result.used_seats, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <KeySquare className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{result.name}</div>
            <div className="text-xs text-muted-foreground">
              {result.vendor || '—'} {result.version ? `· v${result.version}` : ''}
            </div>
          </div>
        </div>
        <Badge variant={result.status === 'Active' ? 'default' : 'secondary'}>{result.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs text-muted-foreground">
        {result.license_type && <div>Type: {result.license_type}</div>}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Seats: {result.used_seats}/{result.total_seats}
          </span>
          <Badge variant={availableSeats > 0 ? 'outline' : 'destructive'} className="font-normal">
            {availableSeats} available
          </Badge>
        </div>
        <div className="inline-flex items-center gap-1">
          <Monitor className="h-3 w-3" /> {result.active_installations} active installation(s)
        </div>
      </CardContent>
    </Card>
  );
}
