import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { GrowthTrendRow } from '@/app/pages/executive/types';

const config: ChartConfig = {
  cumulative_users: { label: 'Headcount', color: 'var(--chart-1)' },
  cumulative_license_seats: { label: 'Purchased License Seats', color: 'var(--chart-2)' },
};

// Growth & Capacity Planning pillar: is license capacity keeping pace
// with headcount growth? If the seats line flattens while headcount
// keeps climbing, that's a signal to plan more purchases; if seats
// pull far ahead of headcount, that's a signal of over-buying.
export function GrowthTrendsChart({ rows }: { rows: GrowthTrendRow[] | unknown }) {
  const safeRows: GrowthTrendRow[] = Array.isArray(rows) ? rows : [];

  const data = safeRows.map((r) => ({
    month: r.month_label,
    cumulative_users: Number(r.cumulative_users),
    cumulative_license_seats: Number(r.cumulative_license_seats),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Headcount vs. License Capacity</CardTitle>
        <CardDescription>Cumulative headcount and purchased license seats over the last 12 months</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-80 w-full">
          <AreaChart data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} allowDecimals={false} fontSize={11} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="cumulative_license_seats"
              stroke="var(--color-cumulative_license_seats)"
              fill="var(--color-cumulative_license_seats)"
              fillOpacity={0.15}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="cumulative_users"
              stroke="var(--color-cumulative_users)"
              fill="var(--color-cumulative_users)"
              fillOpacity={0.25}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
