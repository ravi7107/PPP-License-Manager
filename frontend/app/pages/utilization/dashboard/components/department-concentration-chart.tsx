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

import { UtilizationDepartmentConcentrationRow } from '@/lib/api/utilization.api';

const config: ChartConfig = {
  heavyCount: { label: 'Heavy', color: 'var(--chart-1)' },
  regularCount: { label: 'Regular', color: 'var(--chart-2)' },
  occasionalCount: { label: 'Occasional', color: 'var(--chart-3)' },
  lowCount: { label: 'Low Utilization', color: 'var(--chart-4)' },
  inactiveCount: { label: 'Inactive', color: 'var(--chart-5)' },
  neverUsedCount: { label: 'Never Used', color: 'var(--destructive)' },
};

/*
 * KPI card #3 - turns the tier-distribution donut's org-wide finding
 * into "which department is the actual problem." Department is a
 * trustworthy join here (a real User.DepartmentId FK when matched -
 * IsMatchedToMaster distinguishes that from an unreconciled vendor-
 * reported label, see UtilizationDepartmentConcentrationRow).
 */
export function DepartmentConcentrationChart({
  rows,
}: {
  rows: UtilizationDepartmentConcentrationRow[];
}) {
  const data = rows.map((r) => ({
    department: r.isMatchedToMaster ? r.departmentLabel : `${r.departmentLabel} *`,
    heavyCount: r.heavyCount,
    regularCount: r.regularCount,
    occasionalCount: r.occasionalCount,
    lowCount: r.lowCount,
    inactiveCount: r.inactiveCount,
    neverUsedCount: r.neverUsedCount,
  }));

  const hasUnmatched = rows.some((r) => !r.isMatchedToMaster);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Concentration by Department</CardTitle>
        <CardDescription>
          Usage tier mix per department{hasUnmatched ? ' (* = not matched to your Department master, shown as reported by the vendor)' : ''}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {data.length === 0 ? (
          <div className="flex h-72 w-full items-center justify-center rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">No data to break down yet.</p>
          </div>
        ) : (
          <ChartContainer config={config} className="h-72 w-full">
            <BarChart data={data}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="department"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval={0}
                angle={-15}
                textAnchor="end"
                height={55}
                fontSize={11}
              />
              <YAxis tickLine={false} axisLine={false} fontSize={11} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="heavyCount" stackId="tier" fill="var(--color-heavyCount)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="regularCount" stackId="tier" fill="var(--color-regularCount)" />
              <Bar dataKey="occasionalCount" stackId="tier" fill="var(--color-occasionalCount)" />
              <Bar dataKey="lowCount" stackId="tier" fill="var(--color-lowCount)" />
              <Bar dataKey="inactiveCount" stackId="tier" fill="var(--color-inactiveCount)" />
              <Bar dataKey="neverUsedCount" stackId="tier" fill="var(--color-neverUsedCount)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
