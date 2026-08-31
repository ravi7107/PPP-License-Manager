import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Play } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { getReportHistory, queryToSearch } from '@/lib/reports/report-storage';

function userKey(email: string | undefined): string {
  return email?.toLowerCase() || 'anonymous';
}

export default function ReportHistoryPage() {
  const { user } = useAuth();
  const items = useMemo(
    () => getReportHistory(userKey(user?.email)),
    [user?.email]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Report History</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Preview and Excel runs from this browser, scoped to your account.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          No report runs yet. Generate a preview or export from Report Center.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[13px] font-medium">{item.reportTitle}</div>
                  <Badge variant="outline" className="h-5 text-[10px]">
                    {item.format}
                  </Badge>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {user?.fullName || user?.email || 'User'} · {new Date(item.generatedAt).toLocaleString()} ·{' '}
                  {item.recordCount.toLocaleString('en-IN')} records
                </div>
                {item.filters.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {item.filters.map((filter) => (
                      <Badge key={`${item.id}-${filter.label}`} variant="secondary" className="h-5 font-normal">
                        {filter.label}: {filter.value}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={`/report-center/${item.reportId}?${queryToSearch(item.query)}`}>
                  <Play className="size-3.5" />
                  Run again
                </Link>
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
