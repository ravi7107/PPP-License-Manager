import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { deleteSavedReport, getSavedReports, queryToSearch } from '@/lib/reports/report-storage';

function userKey(email: string | undefined): string {
  return email?.toLowerCase() || 'anonymous';
}

export default function SavedReportsPage() {
  const { user } = useAuth();
  const key = userKey(user?.email);
  const [items, setItems] = useState(() => getSavedReports(key));

  const empty = items.length === 0;

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [items]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Saved Reports</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Re-run frequently used filter configurations without rebuilding them each time.
        </p>
      </div>

      {empty ? (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          No saved reports yet. Open a report, set filters, then choose Save.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {sorted.map((item) => (
            <div key={item.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium">{item.name}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {item.reportTitle} · saved {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link to={`/report-center/${item.reportId}?${queryToSearch(item.filters)}`}>
                    <Play className="size-3.5" />
                    Run
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to={`/report-center/${item.reportId}?${queryToSearch(item.filters)}`}>
                    Export
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setItems(deleteSavedReport(key, item.id))}
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
