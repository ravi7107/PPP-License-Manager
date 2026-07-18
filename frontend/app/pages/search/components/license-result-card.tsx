import { ShieldCheck, Building2, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LicenseSearchResult } from '@/app/pages/search/types';

export function LicenseResultCard({ result }: { result: LicenseSearchResult }) {
  const availableSeats = Math.max(result.total_seats - result.used_seats, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <div>
            <div className="text-sm font-semibold">{result.software_name}</div>
            <div className="text-xs text-muted-foreground">{result.vendor || '—'}</div>
          </div>
        </div>
        <Badge variant={result.status === 'Active' ? 'default' : 'secondary'}>{result.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-1.5 text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <span>
            Seats: {result.used_seats}/{result.total_seats}
          </span>
          <Badge variant={availableSeats > 0 ? 'outline' : 'destructive'} className="font-normal">
            {availableSeats} available
          </Badge>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {result.entity_name && (
            <span className="inline-flex items-center gap-1">
              <Building2 className="h-3 w-3" /> {result.entity_name}
            </span>
          )}
          {result.client_name && (
            <span className="inline-flex items-center gap-1">
              <Landmark className="h-3 w-3" /> {result.client_name}
            </span>
          )}
        </div>
        {result.expiry_date && <div>Expires: {result.expiry_date}</div>}
        {result.renewal_date && <div>Renewal: {result.renewal_date}</div>}
      </CardContent>
    </Card>
  );
}
