import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { Badge } from '@/components/ui/badge';
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

  // Real gap between the two lines already being plotted, read at the
  // most recent month - exactly the question this chart exists to
  // answer, surfaced as a number instead of left to eyeballing the chart.
  const latest = data.length > 0 ? data[data.length - 1] : null;
  const seatHeadcountGap =
    latest !== null ? latest.cumulative_license_seats - latest.cumulative_users : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Headcount vs. License Capacity</CardTitle>
          <CardDescription>Cumulative headcount and purchased license seats over the last 12 months</CardDescription>
        </div>

        {seatHeadcountGap !== null && (
          <Badge
            variant="outline"
            className="shrink-0 whitespace-nowrap"
          >
            {seatHeadcountGap >= 0
              ? `${seatHeadcountGap} seats of headroom`
              : `${Math.abs(seatHeadcountGap)} short of headcount`}
          </Badge>
        )}
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
