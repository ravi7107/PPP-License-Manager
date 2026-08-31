import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileSpreadsheet, RotateCcw, Save, Star } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  emptyQueryFromFilters,
  ReportFilterPanel,
} from '@/app/pages/reports/components/report-filter-panel';
import {
  recordCountFromResult,
  ReportPreview,
} from '@/app/pages/reports/components/report-preview-table';
import {
  exportReport,
  getReportCatalog,
  previewReport,
  ReportCatalogEntry,
  ReportPreviewEnvelope,
  ReportQueryRequest,
} from '@/lib/api/report-center.api';
import { useAuth } from '@/lib/auth/auth-context';
import { loadReportLookups, NamedLookup } from '@/lib/reports/lookups';
import { Company } from '@/lib/api/companies.api';
import { Department } from '@/lib/api/departments.api';
import { Software } from '@/lib/api/software.api';
import { Client } from '@/lib/api/clients.api';
import {
  getFavoriteIds,
  recordRecentUse,
  recordReportHistory,
  saveReport,
  toggleFavorite,
} from '@/lib/reports/report-storage';

function userKey(email: string | undefined): string {
  return email?.toLowerCase() || 'anonymous';
}

function queryFromSearch(params: URLSearchParams, pageSize = 20): Partial<ReportQueryRequest> {
  const numberKeys = [
    'companyId',
    'departmentId',
    'locationId',
    'vendorId',
    'softwareId',
    'clientId',
    'page',
    'pageSize',
  ] as const;
  const next: Partial<ReportQueryRequest> = { pageSize };
  numberKeys.forEach((key) => {
    const value = params.get(key);
    if (value) (next as Record<string, number>)[key] = Number(value);
  });
  ['status', 'search', 'assetType', 'movementType', 'groupBy', 'dateFrom', 'dateTo', 'sortBy', 'sortDirection'].forEach(
    (key) => {
      const value = params.get(key);
      if (value) (next as Record<string, string>)[key] = value;
    }
  );
  return next;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function ReportRunPage() {
  const { reportId = '' } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const key = userKey(user?.email);

  const [catalog, setCatalog] = useState<ReportCatalogEntry[]>([]);
  const [query, setQuery] = useState<ReportQueryRequest>({ page: 1, pageSize: 20 });
  const [envelope, setEnvelope] = useState<ReportPreviewEnvelope | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [lookups, setLookups] = useState<{
    companies: Company[];
    departments: Department[];
    locations: NamedLookup[];
    vendors: NamedLookup[];
    software: Software[];
    clients: Client[];
  }>({
    companies: [],
    departments: [],
    locations: [],
    vendors: [],
    software: [],
    clients: [],
  });

  const report = catalog.find((item) => item.id === reportId);

  useEffect(() => {
    setFavorites(getFavoriteIds(key));
  }, [key]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getReportCatalog(), loadReportLookups()])
      .then(([entries, lookupData]) => {
        if (cancelled) return;
        setCatalog(entries);
        setLookups(lookupData);
        const definition = entries.find((item) => item.id === reportId);
        if (definition) {
          const initial = emptyQueryFromFilters(
            definition.filters,
            queryFromSearch(searchParams)
          );
          setQuery(initial);
          recordRecentUse(key, definition.id, definition.title);
          const preset = [...searchParams.keys()].some(
            (param) => param !== 'export' && param !== 'q'
          );
          if (preset) {
            setGenerating(true);
            previewReport(definition.id, initial)
              .then((result) => {
                if (cancelled) return;
                setEnvelope(result);
                recordReportHistory(key, {
                  reportId: definition.id,
                  reportTitle: definition.title,
                  generatedAt: result.generatedAtUtc,
                  filters: result.appliedFilters,
                  recordCount: recordCountFromResult(result.result),
                  format: 'Preview',
                  query: initial,
                });
              })
              .catch((err) => {
                if (!cancelled) {
                  setError(err instanceof Error ? err.message : 'Unable to generate this report.');
                }
              })
              .finally(() => {
                if (!cancelled) setGenerating(false);
              });
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError('Unable to load the report catalog.');
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId, key, searchParams]);

  async function generate(nextQuery = query) {
    if (!report) return;
    setGenerating(true);
    setError(null);
    try {
      const result = await previewReport(report.id, nextQuery);
      setEnvelope(result);
      recordReportHistory(key, {
        reportId: report.id,
        reportTitle: report.title,
        generatedAt: result.generatedAtUtc,
        filters: result.appliedFilters,
        recordCount: recordCountFromResult(result.result),
        format: 'Preview',
        query: nextQuery,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate this report.');
    } finally {
      setGenerating(false);
    }
  }

  async function onExport() {
    if (!report) return;
    setExporting(true);
    setError(null);
    try {
      const { blob, fileName } = await exportReport(
        report.id,
        query,
        `${report.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
      downloadBlob(blob, fileName);
      recordReportHistory(key, {
        reportId: report.id,
        reportTitle: report.title,
        generatedAt: new Date().toISOString(),
        filters: envelope?.appliedFilters ?? [],
        recordCount: envelope ? recordCountFromResult(envelope.result) : 0,
        format: 'Excel',
        query,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Excel export failed.');
    } finally {
      setExporting(false);
    }
  }

  function resetFilters() {
    if (!report) return;
    setQuery(emptyQueryFromFilters(report.filters));
    setEnvelope(null);
  }

  const generatedLabel = useMemo(() => {
    if (!envelope?.generatedAtUtc) return null;
    return new Date(envelope.generatedAtUtc).toLocaleString();
  }, [envelope]);

  if (loadingCatalog) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
        Unknown report. <Link to="/report-center" className="underline">Back to Report Center</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">{report.title}</h1>
            <Badge variant="outline">{report.category}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-[13px] text-muted-foreground">{report.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setFavorites(toggleFavorite(key, report.id))}
          >
            <Star className={`size-3.5 ${favorites.includes(report.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
            Favorite
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => {
            setSaveName(`${report.title}`);
            setSaveOpen(true);
          }}>
            <Save className="size-3.5" />
            Save
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/report-center">Catalog</Link>
          </Button>
        </div>
      </div>

      <section className="rounded-lg border p-3 md:p-4">
        <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Filters
        </h2>
        <ReportFilterPanel
          filters={report.filters}
          query={query}
          onChange={setQuery}
          companies={lookups.companies}
          departments={lookups.departments}
          locations={lookups.locations}
          vendors={lookups.vendors}
          software={lookups.software}
          clients={lookups.clients}
        />
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetFilters}>
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
          <Button type="button" onClick={() => generate()} disabled={generating}>
            {generating ? 'Generating…' : 'Generate'}
          </Button>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      {generating && !envelope ? (
        <Skeleton className="h-64 w-full" />
      ) : envelope ? (
        <section className="space-y-3 rounded-lg border p-3 md:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[13px] font-medium">
                {recordCountFromResult(envelope.result).toLocaleString('en-IN')} records
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px] text-muted-foreground">
                <span>Generated {generatedLabel}</span>
                {envelope.appliedFilters.length > 0 && <span>·</span>}
                {envelope.appliedFilters.map((filter) => (
                  <Badge key={`${filter.label}-${filter.value}`} variant="secondary" className="h-5 font-normal">
                    {filter.label}: {filter.value}
                  </Badge>
                ))}
                {envelope.appliedFilters.length === 0 && <span>· No filters applied</span>}
              </div>
            </div>
            <Button type="button" onClick={onExport} disabled={exporting}>
              <FileSpreadsheet className="size-3.5" />
              {exporting ? 'Exporting…' : 'Export Excel'}
            </Button>
          </div>
          <ReportPreview
            result={envelope.result}
            onPageChange={(page) => {
              const next = { ...query, page };
              setQuery(next);
              void generate(next);
            }}
          />
        </section>
      ) : (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          Configure filters, then Generate to preview results before exporting Excel.
        </div>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save report configuration</DialogTitle>
          </DialogHeader>
          <Input
            value={saveName}
            onChange={(event) => setSaveName(event.target.value)}
            placeholder="IT Assets - Pune"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!saveName.trim()) return;
                saveReport(key, {
                  name: saveName.trim(),
                  reportId: report.id,
                  reportTitle: report.title,
                  filters: query,
                });
                setSaveOpen(false);
                navigate('/saved-reports');
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
