import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { DepartmentEfficiencyRow } from '@/app/pages/executive/types';

const config: ChartConfig = {
  cost_per_employee: { label: 'Cost / Employee ($)', color: 'var(--chart-3)' },
  assets_per_employee: { label: 'Assets / Employee', color: 'var(--chart-4)' },
};

export function DepartmentEfficiencyChart({ rows }: { rows: DepartmentEfficiencyRow[] }) {
  const data = rows.map((r) => ({
    department: r.department_name,
    cost_per_employee: Number(r.cost_per_employee),
    assets_per_employee: Number(r.assets_per_employee),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Department Efficiency</CardTitle>
        <CardDescription>License cost and hardware assets per employee, by department</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-80 w-full">
          <BarChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="department" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-15} textAnchor="end" height={55} fontSize={11} />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar yAxisId="left" dataKey="cost_per_employee" fill="var(--color-cost_per_employee)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="assets_per_employee" fill="var(--color-assets_per_employee)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
