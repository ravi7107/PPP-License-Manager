import { Bar, BarChart, CartesianGrid, Legend, XAxis, YAxis } from 'recharts';

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

import { UtilizationProductUsageRow } from '@/lib/api/utilization.api';

const config: ChartConfig = {
  assignedSeats: { label: 'Assigned', color: 'var(--chart-2)' },
  usedSeats: { label: 'Used', color: 'var(--chart-4)' },
};

/*
 * Usage by Product - assigned vs. actually-used seats per offering
 * (Software.Name when row-level matched, else the vendor's raw product
 * text). Added because, on real vendor exports, activity/access-option
 * fields are often flat (every row "active"/"Subscription") and the
 * department field is often noisy project labels rather than real org
 * structure - leaving the tier donut and department chart with little
 * to show. Product is usually the one dimension that's both clean and
 * has real spread, so it gets its own chart rather than being buried in
 * a filter dropdown. Sorted worst-utilization-first (see
 * UtilizationAnalysisService.GetProductUsageAsync) - same "actionable,
 * not vanity" ordering as the Least-Used-Users chart.
 */
export function ProductUsageChart({
  rows,
}: {
  rows: UtilizationProductUsageRow[];
}) {
  const data = rows.map((r) => ({
    product: r.isMatchedToSoftwareMaster ? r.softwareLabel : `${r.softwareLabel} *`,
    assignedSeats: r.assignedSeats,
    usedSeats: r.usedSeats,
    utilizationPct: r.utilizationPct,
  }));

  const hasUnmatched = rows.some((r) => !r.isMatchedToSoftwareMaster);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage by Product</CardTitle>
        <CardDescription>
          Assigned vs. used seats per product - the products lowest on utilization are listed
          first{hasUnmatched ? ' (* = not matched to your Software master, shown as reported by the vendor)' : ''}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No data to break down yet.</p>
          </div>
        ) : (
          <ChartContainer config={config} className="h-80 w-full">
            <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="product"
                tickLine={false}
                axisLine={false}
                width={160}
                fontSize={11}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name, item) => {
                      if (name === 'usedSeats') {
                        return [`${value} (${item?.payload?.utilizationPct ?? '—'}%)`, 'Used'];
                      }
                      return [value, 'Assigned'];
                    }}
                  />
                }
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="assignedSeats" fill="var(--color-assignedSeats)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="usedSeats" fill="var(--color-usedSeats)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
