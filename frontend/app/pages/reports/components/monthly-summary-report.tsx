import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useLoadAction } from '@/lib/uibakery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadMonthlySummaryReport from '@/actions/reports/loadMonthlySummaryReport';
import { MonthlySummaryRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const chartConfig: ChartConfig = {
  request_count: { label: 'Requests', color: 'var(--chart-1)' },
  approved_count: { label: 'Approved', color: 'var(--chart-2)' },
  rejected_count: { label: 'Rejected', color: 'var(--chart-4)' },
  allocation_count: { label: 'Allocations', color: 'var(--chart-3)' },
};

const columns: ReportColumn<MonthlySummaryRow>[] = [
  { key: 'month_label', header: 'Month' },
  { key: 'request_count', header: 'Requests' },
  { key: 'approved_count', header: 'Approved' },
  { key: 'rejected_count', header: 'Rejected' },
  { key: 'allocation_count', header: 'New Allocations' },
  { key: 'asset_count', header: 'New Assets' },
];

export function MonthlySummaryReport() {
  const [rows, loading]: [MonthlySummaryRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadMonthlySummaryReport,
    [],
    {},
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Monthly Activity Trend</CardTitle>
          <CardDescription>Requests, approvals/rejections, and allocations over the last 12 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <LineChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="month_label" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="request_count" stroke="var(--color-request_count)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="approved_count" stroke="var(--color-approved_count)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="rejected_count" stroke="var(--color-rejected_count)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="allocation_count" stroke="var(--color-allocation_count)" strokeWidth={2} dot={false} />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <ReportTableCard
        title="Monthly Summary"
        description="Month-by-month activity across requests, approvals, allocations, and new assets."
        rows={rows}
        columns={columns}
        loading={loading}
        fileBaseName="monthly-summary-report"
      />
    </div>
  );
}
