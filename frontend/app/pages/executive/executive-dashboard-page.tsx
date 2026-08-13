import { useLoadAction } from '@/lib/uibakery';
import { Crown } from 'lucide-react';
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

export default function ExecutiveDashboardPage() {
  const [overview, loading]: [ExecutiveOverviewData | null, boolean, Error | null, () => Promise<void>] =
    useLoadAction(loadExecutiveOverview, null, {});

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Executive Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Cost &amp; spend, utilization &amp; efficiency, and growth &amp; capacity planning - across your organization.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ExecutiveKpiCards summary={overview?.investmentSummary} />
      )}

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Cost &amp; Spend Optimization</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {loading ? (
              <ChartCardSkeleton heightClassName="h-72" />
            ) : (
              <CostBreakdownCharts
                departmentRows={overview?.departmentCost ?? []}
                clientRows={overview?.clientCost ?? []}
                entityRows={overview?.entityCost ?? []}
              />
            )}
          </div>
          {loading ? <ChartCardSkeleton heightClassName="h-64" /> : <UpcomingRenewalsCard rows={overview?.upcomingRenewals ?? []} />}
        </div>

        <div className="mt-4">
          {loading ? <ChartCardSkeleton heightClassName="h-80" /> : <TopSoftwareChart rows={overview?.topExpensiveSoftware ?? []} />}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Utilization &amp; Efficiency</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? <ChartCardSkeleton heightClassName="h-80" /> : <DepartmentEfficiencyChart rows={overview?.departmentEfficiency ?? []} />}
          {loading ? <ChartCardSkeleton heightClassName="h-64" /> : <AssetUtilizationChart rows={overview?.assetUtilization ?? []} />}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Growth &amp; Capacity Planning</h3>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {loading ? <ChartCardSkeleton heightClassName="h-80" /> : <AllocationTrendsChart rows={overview?.allocationTrends ?? []} />}
          {loading ? <ChartCardSkeleton heightClassName="h-80" /> : <GrowthTrendsChart rows={overview?.growthTrends ?? []} />}
        </div>

        <div className="mt-4">
          {loading ? <ChartCardSkeleton heightClassName="h-64" /> : <CapacityRunwayCard rows={overview?.capacityRunway ?? []} />}
        </div>
      </div>
    </div>
  );
}
