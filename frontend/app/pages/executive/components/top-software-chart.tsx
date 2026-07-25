import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { TopExpensiveSoftwareRow } from '@/app/pages/executive/types';

const config: ChartConfig = {
  total_cost: { label: 'Total Cost (₹)', color: 'var(--chart-2)' },
};

export function TopSoftwareChart({ rows }: { rows: TopExpensiveSoftwareRow[] | unknown }) {
  const safeRows: TopExpensiveSoftwareRow[] = Array.isArray(rows) ? rows : [];

  const data = safeRows.map((r) => ({
    name: r.software_name || 'Unknown',
    total_cost: Number(r.total_cost || 0),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Expensive Software</CardTitle>
        <CardDescription>Highest annual license spend by title</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-80 w-full">
          <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v).toLocaleString('en-IN')}`} fontSize={11} />
            <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={120} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Total Cost']} />} />
            <Bar dataKey="total_cost" fill="var(--color-total_cost)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
