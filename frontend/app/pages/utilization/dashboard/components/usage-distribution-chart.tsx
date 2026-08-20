import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';

import { UtilizationUsageDistributionBucket } from '@/lib/api/utilization.api';

const config: ChartConfig = {
  userCount: { label: 'Users', color: 'var(--chart-2)' },
};

/*
 * KPI card #5 - the module's "distribution" chart (per the spec's chart
 * list). Standing in for a multi-period trend line, which Pass 1
 * deliberately doesn't build - a single uploaded period has nothing to
 * trend against yet (see the module's plan, Pass 2 covers historical
 * trend analysis once multiple periods exist).
 */
export function UsageDistributionChart({
  rows,
}: {
  rows: UtilizationUsageDistributionBucket[];
}) {
  const data = rows.map((r) => ({ bucket: r.bucketLabel, userCount: r.userCount }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage Distribution</CardTitle>
        <CardDescription>How many assigned users fall into each days-used range</CardDescription>
      </CardHeader>

      <CardContent>
        {data.every((d) => d.userCount === 0) ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No usage-day data available yet.</p>
          </div>
        ) : (
          <ChartContainer config={config} className="h-64 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="bucket" tickLine={false} axisLine={false} fontSize={11} tickMargin={8} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="userCount" fill="var(--color-userCount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
