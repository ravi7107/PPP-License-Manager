import { useEffect } from 'react';
import {
  Crown,
  Landmark,
  RefreshCw,
  AlertCircle,
  DollarSign,
  Gauge,
  TrendingUp,
} from 'lucide-react';

import { useLoadAction } from '@/lib/uibakery';
import { useAuth } from '@/lib/auth/auth-context';
import { Badge } from '@/components/ui/badge';
import loadExecutiveOverview from '@/actions/executive/loadExecutiveOverview';
import {
  InvestmentSummaryRow,
  TopExpensiveSoftwareRow,
  UpcomingRenewalRow,
  DepartmentEfficiencyRow,
  AllocationTrendRow,
  AssetUtilizationSlice,
  GrowthTrendRow,
  CapacityRunwayRow,
} from '@/app/pages/executive/types';
import { DepartmentCostRow, ClientReportRow, EntityReportRow } from '@/app/pages/reports/types';
import { buildExecutiveInsights } from '@/app/pages/executive/insights';
import { ExecutiveInsightStrip } from '@/app/pages/executive/components/executive-insight-strip';
import { ExecutiveKpiCards } from '@/app/pages/executive/components/executive-kpi-cards';
import { CostBreakdownCharts } from '@/app/pages/executive/components/cost-breakdown-charts';
import { TopSoftwareChart } from '@/app/pages/executive/components/top-software-chart';
import { UpcomingRenewalsCard } from '@/app/pages/executive/components/upcoming-renewals-card';
import { AssetUtilizationChart } from '@/app/pages/executive/components/asset-utilization-chart';
import { DepartmentEfficiencyChart } from '@/app/pages/executive/components/department-efficiency-chart';
import { AllocationTrendsChart } from '@/app/pages/executive/components/allocation-trends-chart';
import { GrowthTrendsChart } from '@/app/pages/executive/components/growth-trends-chart';
import { CapacityRunwayCard } from '@/app/pages/executive/components/capacity-runway-card';
import { KpiCardSkeleton, ChartCardSkeleton } from '@/components/layout/kpi-card-skeleton';

interface ExecutiveOverviewData {
  investmentSummary: InvestmentSummaryRow;
  topExpensiveSoftware: TopExpensiveSoftwareRow[];
  upcomingRenewals: UpcomingRenewalRow[];
  departmentEfficiency: DepartmentEfficiencyRow[];
  allocationTrends: AllocationTrendRow[];
  assetUtilization: AssetUtilizationSlice[];
  departmentCost: DepartmentCostRow[];
  clientCost: ClientReportRow[];
  entityCost: EntityReportRow[];
  growthTrends: GrowthTrendRow[];
  capacityRunway: CapacityRunwayRow[];
}

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof DollarSign;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default function ExecutiveDashboardPage() {
  const [overview, loading, error, reload]: [
    ExecutiveOverviewData | null,
    boolean,
    Error | null,
    () => Promise<void>,
  ] = useLoadAction(loadExecutiveOverview, null, {});

  // A Manager only ever sees their own Entity's numbers here (enforced
  // server-side by EntityScopeHelper, same as the Dashboard page) -
  // surfacing the entity name so that's visible instead of left implicit.
  const { user } = useAuth();
  const companyName = user?.companyName;

  // Shared premium theme (index.css `app-premium-theme`, also used by
  // Hardware Assets) - scoped to <body> so Radix-portaled Select/Dialog/
  // DropdownMenu content picks it up too, not just this page's own DOM.
  useEffect(() => {
    document.body.classList.add('app-premium-theme');

    return () => {
      document.body.classList.remove('app-premium-theme');
    };
  }, []);

  const insights = buildExecutiveInsights(
    overview?.investmentSummary,
    overview?.capacityRunway ?? []
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-transparent to-transparent p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Crown className="h-5 w-5" />
            </div>

            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Strategic Overview</Badge>

                {companyName && (
                  <Badge variant="outline" className="gap-1.5">
                    <Landmark className="h-3 w-3" />
                    {companyName}
                  </Badge>
                )}
              </div>

              <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Executive Dashboard
              </h2>

              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Cost &amp; spend, utilization &amp; efficiency, and growth &amp; capacity planning -
                across your organization.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => reload()}
            disabled={loading}
            className="inline-flex h-10 shrink-0 items-center gap-2 self-start rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:shadow disabled:opacity-60 md:self-auto"
          >
            <RefreshCw className={loading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-500/5 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:text-red-400">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Unable to load executive analytics. The figures below may be out of date.
          </div>

          <button
            type="button"
            onClick={() => reload()}
            className="shrink-0 rounded-md border border-red-200 bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent dark:border-red-900/60"
          >
            Retry
          </button>
        </div>
      )}

      {loading && !overview ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ExecutiveInsightStrip insights={insights} />
      )}

      {loading && !overview ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ExecutiveKpiCards summary={overview?.investmentSummary} />
      )}

      <div>
        <SectionHeader
          icon={DollarSign}
          title="Cost & Spend Optimization"
          description="Where license spend is going, and what it's buying"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading && !overview ? (
              <ChartCardSkeleton heightClassName="h-72" />
            ) : (
              <CostBreakdownCharts
                departmentRows={overview?.departmentCost ?? []}
                clientRows={overview?.clientCost ?? []}
                entityRows={overview?.entityCost ?? []}
              />
            )}
          </div>
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-64" />
          ) : (
            <UpcomingRenewalsCard rows={overview?.upcomingRenewals ?? []} />
          )}
        </div>

        <div className="mt-4">
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-80" />
          ) : (
            <TopSoftwareChart rows={overview?.topExpensiveSoftware ?? []} />
          )}
        </div>
      </div>

      <div>
        <SectionHeader
          icon={Gauge}
          title="Utilization & Efficiency"
          description="How well what's already been bought is being put to use"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-80" />
          ) : (
            <DepartmentEfficiencyChart rows={overview?.departmentEfficiency ?? []} />
          )}
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-64" />
          ) : (
            <AssetUtilizationChart rows={overview?.assetUtilization ?? []} />
          )}
        </div>
      </div>

      <div>
        <SectionHeader
          icon={TrendingUp}
          title="Growth & Capacity Planning"
          description="Whether license capacity is keeping pace with the organization"
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-80" />
          ) : (
            <AllocationTrendsChart rows={overview?.allocationTrends ?? []} />
          )}
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-80" />
          ) : (
            <GrowthTrendsChart rows={overview?.growthTrends ?? []} />
          )}
        </div>

        <div className="mt-4">
          {loading && !overview ? (
            <ChartCardSkeleton heightClassName="h-64" />
          ) : (
            <CapacityRunwayCard rows={overview?.capacityRunway ?? []} />
          )}
        </div>
      </div>
    </div>
  );
}
