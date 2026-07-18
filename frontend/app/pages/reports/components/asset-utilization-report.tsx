import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useLoadAction } from '@/lib/uibakery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadAssetUtilizationReport from '@/actions/reports/loadAssetUtilizationReport';
import { AssetUtilizationRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const chartConfig: ChartConfig = {
  asset_count: { label: 'Assets', color: 'var(--chart-3)' },
};

const columns: ReportColumn<AssetUtilizationRow>[] = [
  { key: 'status', header: 'Status' },
  { key: 'asset_count', header: 'Asset Count' },
  { key: 'assigned_count', header: 'Assigned' },
  { key: 'unassigned_count', header: 'Unassigned' },
  { key: 'percent_of_fleet', header: '% of Fleet', format: (v) => `${v}%` },
];

export function AssetUtilizationReport() {
  const [rows, loading]: [AssetUtilizationRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadAssetUtilizationReport,
    [],
    {},
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Asset Utilization by Status</CardTitle>
          <CardDescription>Distribution of the asset fleet across statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="status" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="asset_count" fill="var(--color-asset_count)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <ReportTableCard
        title="Asset Utilization Breakdown"
        description="Assigned vs. unassigned assets per status."
        rows={rows}
        columns={columns}
        loading={loading}
        fileBaseName="asset-utilization-report"
      />
    </div>
  );
}
