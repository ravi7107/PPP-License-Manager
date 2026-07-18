import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { useLoadAction } from '@/lib/uibakery';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { ReportTableCard } from '@/app/pages/reports/components/report-table-card';
import loadClientWiseReport from '@/actions/reports/loadClientWiseReport';
import { ClientReportRow } from '@/app/pages/reports/types';
import { ReportColumn } from '@/lib/utils/report-export';

const seatsConfig: ChartConfig = {
  allocated_seats: { label: 'Allocated Seats', color: 'var(--chart-2)' },
};

const columns: ReportColumn<ClientReportRow>[] = [
  { key: 'client_name', header: 'Client' },
  { key: 'software_titles', header: 'Titles' },
  { key: 'total_seats', header: 'Pool Seats' },
  { key: 'allocated_seats', header: 'Allocated Seats' },
  { key: 'total_cost', header: 'Cost', format: (v) => `$${Number(v).toLocaleString()}` },
];

export function ClientWiseReport() {
  const [rows, loading]: [ClientReportRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadClientWiseReport,
    [],
    {},
  );

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Allocated Seats by Client</CardTitle>
          <CardDescription>Seats in use on assets tied to each client.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={seatsConfig} className="h-72 w-full">
            <BarChart data={rows}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="client_name"
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
              <Bar dataKey="allocated_seats" fill="var(--color-allocated_seats)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <ReportTableCard
        title="Client Cost Report"
        description="Client-billed license pools and seat-level allocations."
        rows={rows}
        columns={columns}
        loading={loading}
        fileBaseName="client-cost-report"
      />
    </div>
  );
}
