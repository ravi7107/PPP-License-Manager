import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Bookmark,
  Clock3,
  FileSpreadsheet,
  Search,
  Star,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { getReportCatalog, ReportCatalogEntry } from '@/lib/api/report-center.api';
import { useAuth } from '@/lib/auth/auth-context';
import {
  getFavoriteIds,
  getRecentReports,
  toggleFavorite,
} from '@/lib/reports/report-storage';

const CATEGORIES = [
  'All',
  'Executive',
  'Assets',
  'Licensing',
  'Allocations',
  'Procurement',
  'Utilization',
  'Maintenance',
  'People',
  'Projects',
  'Administration',
] as const;

function userKey(email: string | undefined): string {
  return email?.toLowerCase() || 'anonymous';
}

function matchesQuery(report: ReportCatalogEntry, query: string): boolean {
  if (!query) return true;
  const haystack = [
    report.title,
    report.description,
    report.category,
    ...report.filters.map((filter) => filter.label),
  ]
    .join(' ')
    .toLowerCase();
  return query.split(/\s+/).every((token) => haystack.includes(token));
}

export default function ReportCenterPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [catalog, setCatalog] = useState<ReportCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recent, setRecent] = useState(() => getRecentReports(userKey(user?.email)));

  const search = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? 'All';

  useEffect(() => {
    const key = userKey(user?.email);
    setFavorites(getFavoriteIds(key));
    setRecent(getRecentReports(key));
  }, [user?.email]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getReportCatalog()
      .then((entries) => {
        if (!cancelled) {
          setCatalog(entries);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(
            'Report Center API is not available yet. Apply the Phase 1 backend patch, then rebuild the backend.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleCategories = useMemo(() => {
    const present = new Set(catalog.map((report) => report.category));
    return CATEGORIES.filter((item) => item === 'All' || present.has(item));
  }, [catalog]);

  const filtered = useMemo(
    () =>
      catalog.filter((report) => {
        const categoryOk = category === 'All' || report.category === category;
        return categoryOk && matchesQuery(report, search.trim().toLowerCase());
      }),
    [catalog, category, search]
  );

  const favoriteReports = filtered.filter((report) => favorites.includes(report.id));
  const recentReports = recent
    .map((item) => catalog.find((report) => report.id === item.reportId))
    .filter((report): report is ReportCatalogEntry => Boolean(report))
    .filter((report) => matchesQuery(report, search.trim().toLowerCase()))
    .slice(0, 6);

  const grouped = useMemo(() => {
    const map = new Map<string, ReportCatalogEntry[]>();
    filtered.forEach((report) => {
      const list = map.get(report.category) ?? [];
      list.push(report);
      map.set(report.category, list);
    });
    return Array.from(map.entries());
  }, [filtered]);

  function onToggleFavorite(reportId: string) {
    setFavorites(toggleFavorite(userKey(user?.email), reportId));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Report Center</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Generate, analyze and export PPS SmartAsset data.
          </p>
          <div className="mt-2">
            <ReportCenterShortcuts />
          </div>
        </div>
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              const next = new URLSearchParams(searchParams);
              if (event.target.value) next.set('q', event.target.value);
              else next.delete('q');
              setSearchParams(next, { replace: true });
            }}
            placeholder="Search reports..."
            className="h-9 pl-8"
          />
        </div>
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {visibleCategories.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              if (item === 'All') next.delete('category');
              else next.set('category', item);
              setSearchParams(next, { replace: true });
            }}
            className={`h-8 shrink-0 rounded-md px-3 text-[13px] font-medium ${
              category === item
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          No reports match “{search || category}”.
        </div>
      ) : (
        <>
          {favoriteReports.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Favorites
              </h2>
              <div className="divide-y rounded-lg border">
                {favoriteReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    favorited
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          )}

          {recentReports.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Recently Used
              </h2>
              <div className="divide-y rounded-lg border">
                {recentReports.map((report) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    favorited={favorites.includes(report.id)}
                    onToggleFavorite={onToggleFavorite}
                  />
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Report Categories
            </h2>
            {grouped.map(([group, reports]) => (
              <div key={group} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-medium">{group}</h3>
                  <span className="text-[11px] text-muted-foreground">{reports.length}</span>
                </div>
                <div className="divide-y rounded-lg border">
                  {reports.map((report) => (
                    <ReportRow
                      key={report.id}
                      report={report}
                      favorited={favorites.includes(report.id)}
                      onToggleFavorite={onToggleFavorite}
                    />
                  ))}
                </div>
              </div>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function ReportRow({
  report,
  favorited,
  onToggleFavorite,
}: {
  report: ReportCatalogEntry;
  favorited: boolean;
  onToggleFavorite: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 px-3 py-2.5 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/report-center/${report.id}`}
            className="text-[13px] font-medium hover:underline"
          >
            {report.title}
          </Link>
          <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
            {report.category}
          </Badge>
        </div>
        <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">
          {report.description}
        </p>
        <p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">
          Filters: {report.filters.map((filter) => filter.label).join(', ') || 'None'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => onToggleFavorite(report.id)}
          aria-label={favorited ? 'Remove favorite' : 'Add favorite'}
        >
          <Star className={`size-3.5 ${favorited ? 'fill-amber-400 text-amber-500' : ''}`} />
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link to={`/report-center/${report.id}`}>Preview</Link>
        </Button>
        <Button asChild size="sm">
          <Link to={`/report-center/${report.id}`}>
            <FileSpreadsheet className="size-3.5" />
            Excel
          </Link>
        </Button>
      </div>
    </div>
  );
}

export function ReportCenterShortcuts() {
  return (
    <div className="flex gap-2">
      <Button asChild variant="outline" size="sm">
        <Link to="/saved-reports">
          <Bookmark className="size-3.5" />
          Saved
        </Link>
      </Button>
      <Button asChild variant="outline" size="sm">
        <Link to="/report-history">
          <Clock3 className="size-3.5" />
          History
        </Link>
      </Button>
    </div>
  );
}
