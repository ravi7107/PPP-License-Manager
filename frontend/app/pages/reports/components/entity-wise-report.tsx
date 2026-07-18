import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useLoadAction } from '@/lib/uibakery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadEntityWiseReport from '@/actions/reports/loadEntityWiseReport';
import { EntityReportRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const costConfig: ChartConfig = {
  total_cost: { label: 'License Cost ($)', color: 'var(--chart-1)' },
};

const columns: ReportColumn<EntityReportRow>[] = [
  { key: 'entity_name', header: 'Entity' },
  { key: 'software_titles', header: 'Titles' },
  { key: 'total_seats', header: 'Seats' },
  { key: 'used_seats', header: 'Used' },
  { key: 'total_cost', header: 'Cost', format: (v) => `$${Number(v).toLocaleString()}` },
];

export function EntityWiseReport() {
  const [rows, loading]: [EntityReportRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadEntityWiseReport,
    [],
    {},
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">License Cost by Entity</CardTitle>
          <CardDescription>Total license spend allocated per business entity/department.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={costConfig} className="h-72 w-full">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="entity_name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
                fontSize={11}
              />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="total_cost" fill="var(--color-total_cost)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <ReportTableCard
        title="Entity Cost Report"
        description="Seats used/available and license cost per entity."
        rows={rows}
        columns={columns}
        loading={loading}
        fileBaseName="entity-cost-report"
      />
    </div>
  );
}
