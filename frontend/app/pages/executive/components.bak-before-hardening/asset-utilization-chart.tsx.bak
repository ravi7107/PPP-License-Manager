import { Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { AssetUtilizationSlice } from '@/app/pages/executive/types';

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

const config: ChartConfig = {
  asset_count: { label: 'Assets', color: 'var(--chart-1)' },
};

export function AssetUtilizationChart({ rows }: { rows: AssetUtilizationSlice[] }) {
  const data = rows.map((r) => ({ status: r.status, asset_count: Number(r.asset_count), percent: Number(r.percent_of_fleet) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Asset Utilization</CardTitle>
        <CardDescription>Fleet breakdown by status</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-2">
        <ChartContainer config={config} className="h-64 w-full">
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="status" formatter={(value, _name, item) => [`${value} (${item?.payload?.percent ?? 0}%)`, item?.payload?.status]} />} />
            <Pie data={data} dataKey="asset_count" nameKey="status" innerRadius={55} outerRadius={90} paddingAngle={2}>
              {data.map((_, index) => (
                <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="grid w-full grid-cols-2 gap-2 text-xs">
          {data.map((d, i) => (
            <div key={d.status} className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
              <span className="text-muted-foreground">{d.status}</span>
              <span className="ml-auto font-medium">{d.percent}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
