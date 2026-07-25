import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Line, LineChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { AllocationTrendRow } from '@/app/pages/executive/types';

const config: ChartConfig = {
  new_allocations: { label: 'New Allocations', color: 'var(--chart-1)' },
  active_allocations: { label: 'Active Allocations', color: 'var(--chart-2)' },
};

export function AllocationTrendsChart({ rows }: { rows: AllocationTrendRow[] | unknown }) {
  const safeRows: AllocationTrendRow[] = Array.isArray(rows) ? rows : [];

  const data = safeRows.map((r) => ({
    month: r.month_label,
    new_allocations: Number(r.new_allocations),
    active_allocations: Number(r.active_allocations),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Software Allocation Trends</CardTitle>
        <CardDescription>New monthly allocations vs. cumulative active allocations (last 12 months)</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-80 w-full">
          <AreaChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area type="monotone" dataKey="active_allocations" stroke="var(--color-active_allocations)" fill="var(--color-active_allocations)" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="new_allocations" stroke="var(--color-new_allocations)" fill="var(--color-new_allocations)" fillOpacity={0.25} strokeWidth={2} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
