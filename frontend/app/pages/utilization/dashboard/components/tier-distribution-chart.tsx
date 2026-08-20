import { Pie, PieChart, Cell } from 'recharts';

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

import { UtilizationTierDistributionRow } from '@/lib/api/utilization.api';

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--destructive)',
  'var(--muted-foreground)',
];

const config: ChartConfig = {
  userCount: { label: 'Users', color: 'var(--chart-1)' },
};

/*
 * KPI card #2 in the Pass-1 dashboard (see the module's plan) - answers
 * "how healthy is our utilization mix" at a glance. Every user counted
 * here is already filtered to IsUsableForCalculation facts on the
 * backend (see UtilizationAnalysisService.GetTierDistributionAsync) -
 * this never shows a tier for data the module couldn't actually derive.
 */
export function TierDistributionChart({
  rows,
}: {
  rows: UtilizationTierDistributionRow[];
}) {
  const total = rows.reduce((sum, r) => sum + r.userCount, 0);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">Usage Tier Distribution</CardTitle>
        <CardDescription>
          Assigned users classified by how much of the reporting period they actually used
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3">
        {rows.length === 0 ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-sm font-medium">No usable data yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Upload and process a utilization report to see tier distribution.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-full">
              <ChartContainer config={config} className="h-64 w-full">
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="tier"
                        formatter={(value, _name, item) => [
                          `${Number(value).toLocaleString('en-IN')} (${item?.payload?.percentOfAssigned ?? 0}%)`,
                          item?.payload?.tier,
                        ]}
                      />
                    }
                  />
                  <Pie
                    data={rows}
                    dataKey="userCount"
                    nameKey="tier"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    animationDuration={800}
                  >
                    {rows.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold tracking-tight">
                    {total.toLocaleString('en-IN')}
                  </div>
                  <div className="text-[11px] text-muted-foreground">Assigned Users</div>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {rows.map((row, index) => (
                <div
                  key={row.tier}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                  />
                  <span className="truncate text-muted-foreground">{row.tier}</span>
                  <span className="ml-auto font-medium">{row.percentOfAssigned}%</span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
