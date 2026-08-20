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

import { UtilizationLeastUsedUserRow } from '@/lib/api/utilization.api';

const config: ChartConfig = {
  daysUsedInPeriod: { label: 'Days Used', color: 'var(--chart-4)' },
};

/*
 * KPI card #4 - the Pareto-style "who to look at first" list (sorted
 * ascending by days used, per the module's plan: a least-used ranking is
 * actionable, a most-used ranking is vanity). Gives a concrete, named
 * starting point for reclaiming seats.
 */
export function LeastUsedUsersChart({
  rows,
}: {
  rows: UtilizationLeastUsedUserRow[];
}) {
  const data = rows.map((r) => ({
    name: r.isMatchedToUserMaster ? r.displayName : `${r.displayName} *`,
    daysUsedInPeriod: r.daysUsedInPeriod ?? 0,
    tier: r.tier,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Least-Used Assigned Seats</CardTitle>
        <CardDescription>
          Lowest days-used in the reporting period - the first candidates to review for reclaiming
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-80 w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No assigned seats with usage data yet.</p>
          </div>
        ) : (
          <ChartContainer config={config} className="h-80 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={140}
                fontSize={11}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => [
                      `${value} days (${item?.payload?.tier})`,
                      'Usage',
                    ]}
                  />
                }
              />
              <Bar dataKey="daysUsedInPeriod" fill="var(--color-daysUsedInPeriod)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
