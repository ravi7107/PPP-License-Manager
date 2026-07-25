import {
  Pie,
  PieChart,
  Cell,
} from 'recharts';

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

import { AssetUtilizationSlice } from '@/app/pages/executive/types';

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const config: ChartConfig = {
  asset_count: {
    label: 'Assets',
    color: 'var(--chart-1)',
  },
};

export function AssetUtilizationChart({
  rows,
}: {
  rows: AssetUtilizationSlice[] | unknown;
}) {
  /*
   * Defensive normalization:
   * Legacy UI Bakery actions may return an object instead
   * of an array. Never allow that to crash Executive.
   */
  const safeRows: AssetUtilizationSlice[] =
    Array.isArray(rows) ? rows : [];

  const data = safeRows.map((row) => ({
    status: row.status || 'Unknown',
    asset_count: Number(row.asset_count || 0),
    percent: Number(row.percent_of_fleet || 0),
  }));

  const totalAssets = data.reduce(
    (sum, row) => sum + row.asset_count,
    0
  );

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">
          Asset Utilization
        </CardTitle>

        <CardDescription>
          Fleet breakdown by status
        </CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-3">
        {data.length === 0 ? (
          <div className="flex h-64 w-full items-center justify-center rounded-lg border border-dashed">
            <div className="text-center">
              <p className="text-sm font-medium">
                No asset utilization data
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Asset status information will appear here when data is available.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="relative w-full">
              <ChartContainer
                config={config}
                className="h-64 w-full"
              >
                <PieChart>
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        nameKey="status"
                        formatter={(
                          value,
                          _name,
                          item
                        ) => [
                          `${Number(value).toLocaleString('en-IN')} (${item?.payload?.percent ?? 0}%)`,
                          item?.payload?.status,
                        ]}
                      />
                    }
                  />

                  <Pie
                    data={data}
                    dataKey="asset_count"
                    nameKey="status"
                    innerRadius={58}
                    outerRadius={92}
                    paddingAngle={3}
                    animationDuration={800}
                  >
                    {data.map((_, index) => (
                      <Cell
                        key={index}
                        fill={
                          PIE_COLORS[
                            index % PIE_COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold tracking-tight">
                    {totalAssets.toLocaleString('en-IN')}
                  </div>

                  <div className="text-[11px] text-muted-foreground">
                    Total Assets
                  </div>
                </div>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {data.map((row, index) => (
                <div
                  key={`${row.status}-${index}`}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        PIE_COLORS[
                          index % PIE_COLORS.length
                        ],
                    }}
                  />

                  <span className="truncate text-muted-foreground">
                    {row.status}
                  </span>

                  <span className="ml-auto font-medium">
                    {row.percent}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
