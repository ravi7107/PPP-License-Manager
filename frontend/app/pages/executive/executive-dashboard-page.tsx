import { useLoadAction } from '@/lib/uibakery';
import { Crown } from 'lucide-react';
import loadInvestmentSummary from '@/actions/executive/loadInvestmentSummary';
import loadTopExpensiveSoftware from '@/actions/executive/loadTopExpensiveSoftware';
import loadUpcomingRenewals from '@/actions/executive/loadUpcomingRenewals';
import loadDepartmentEfficiency from '@/actions/executive/loadDepartmentEfficiency';
import loadSoftwareAllocationTrends from '@/actions/executive/loadSoftwareAllocationTrends';
import loadDepartmentCostReport from '@/actions/reports/loadDepartmentCostReport';
import loadClientWiseReport from '@/actions/reports/loadClientWiseReport';
import loadEntityWiseReport from '@/actions/reports/loadEntityWiseReport';
import loadAssetUtilizationReport from '@/actions/reports/loadAssetUtilizationReport';
import {
  InvestmentSummaryRow,
  TopExpensiveSoftwareRow,
  UpcomingRenewalRow,
  DepartmentEfficiencyRow,
  AllocationTrendRow,
  AssetUtilizationSlice,
} from '@/app/pages/executive/types';
import { DepartmentCostRow, ClientReportRow, EntityReportRow } from '@/app/pages/reports/types';
import { ExecutiveKpiCards } from '@/app/pages/executive/components/executive-kpi-cards';
import { CostBreakdownCharts } from '@/app/pages/executive/components/cost-breakdown-charts';
import { TopSoftwareChart } from '@/app/pages/executive/components/top-software-chart';
import { UpcomingRenewalsCard } from '@/app/pages/executive/components/upcoming-renewals-card';
import { AssetUtilizationChart } from '@/app/pages/executive/components/asset-utilization-chart';
import { DepartmentEfficiencyChart } from '@/app/pages/executive/components/department-efficiency-chart';
import { AllocationTrendsChart } from '@/app/pages/executive/components/allocation-trends-chart';
import { KpiCardSkeleton, ChartCardSkeleton } from '@/components/layout/kpi-card-skeleton';

export default function ExecutiveDashboardPage() {
  const [summaryRows, summaryLoading]: [InvestmentSummaryRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadInvestmentSummary,
    [],
    {},
  );
  const [topSoftware, topSoftwareLoading]: [TopExpensiveSoftwareRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadTopExpensiveSoftware,
    [],
    {},
  );
  const [renewals, renewalsLoading]: [UpcomingRenewalRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(loadUpcomingRenewals, [], {});
  const [deptEfficiency, deptEfficiencyLoading]: [DepartmentEfficiencyRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadDepartmentEfficiency,
    [],
    {},
  );
  const [allocationTrends, allocationTrendsLoading]: [AllocationTrendRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadSoftwareAllocationTrends,
    [],
    {},
  );
  const [departmentCost, costLoading]: [DepartmentCostRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadDepartmentCostReport,
    [],
    {},
  );
  const [clientCost]: [ClientReportRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(loadClientWiseReport, [], {});
  const [entityCost]: [EntityReportRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(loadEntityWiseReport, [], {});
  const [assetUtilization, assetUtilizationLoading]: [AssetUtilizationSlice[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAssetUtilizationReport,
    [],
    {},
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Executive Dashboard</h2>
          <p className="text-sm text-muted-foreground">Enterprise-wide software investment, utilization, and efficiency overview.</p>
        </div>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ExecutiveKpiCards summary={summaryRows?.[0]} />
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {costLoading ? (
            <ChartCardSkeleton heightClassName="h-72" />
          ) : (
            <CostBreakdownCharts departmentRows={departmentCost ?? []} clientRows={clientCost ?? []} entityRows={entityCost ?? []} />
          )}
        </div>
        {assetUtilizationLoading ? <ChartCardSkeleton heightClassName="h-64" /> : <AssetUtilizationChart rows={assetUtilization ?? []} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {topSoftwareLoading ? <ChartCardSkeleton heightClassName="h-80" /> : <TopSoftwareChart rows={topSoftware ?? []} />}
        {deptEfficiencyLoading ? <ChartCardSkeleton heightClassName="h-80" /> : <DepartmentEfficiencyChart rows={deptEfficiency ?? []} />}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {allocationTrendsLoading ? <ChartCardSkeleton heightClassName="h-80" /> : <AllocationTrendsChart rows={allocationTrends ?? []} />}
        {renewalsLoading ? <ChartCardSkeleton heightClassName="h-64" /> : <UpcomingRenewalsCard rows={renewals ?? []} />}
      </div>
    </div>
  );
}
