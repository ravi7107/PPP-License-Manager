import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from '@/components/ui/tabs';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';

import {
  DepartmentCostRow,
  EntityReportRow,
  ClientReportRow,
} from '@/app/pages/reports/types';

const costConfig: ChartConfig = {
  total_cost: {
    label: 'Cost (₹)',
    color: 'var(--chart-1)',
  },
};

function formatINR(value: number | string) {
  return `₹${Number(value || 0).toLocaleString('en-IN')}`;
}

function CostBarChart({
  data,
  dataKeyLabel,
}: {
  data: {
    name: string;
    total_cost: number;
  }[];
  dataKeyLabel: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-dashed">
        <div className="text-center">
          <p className="text-sm font-medium">
            No cost data available
          </p>

          <p className="mt-1 text-xs text-muted-foreground">
            Cost information will appear here when data is available.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ChartContainer
      config={costConfig}
      className="h-72 w-full"
    >
      <BarChart
        data={data}
        layout="vertical"
        margin={{
          left: 12,
          right: 30,
          top: 10,
          bottom: 10,
        }}
      >
        <CartesianGrid horizontal={false} />

        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) =>
            formatINR(Number(value))
          }
          fontSize={11}
        />

        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={110}
          fontSize={11}
        />

        <ChartTooltip
          content={
            <ChartTooltipContent
              labelKey="name"
              formatter={(value) => [
                formatINR(Number(value)),
                dataKeyLabel,
              ]}
            />
          }
        />

        <Bar
          dataKey="total_cost"
          fill="var(--color-total_cost)"
          radius={[0, 6, 6, 0]}
          animationDuration={800}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function CostBreakdownCharts({
  departmentRows,
  clientRows,
  entityRows,
}: {
  departmentRows: DepartmentCostRow[] | unknown;
  clientRows: ClientReportRow[] | unknown;
  entityRows: EntityReportRow[] | unknown;
}) {
  /*
   * Defensive normalization.
   *
   * Some legacy UI Bakery actions may currently return
   * an object rather than an array. Never allow that
   * response shape to crash the Executive Dashboard.
   */
  const safeDepartmentRows: DepartmentCostRow[] =
    Array.isArray(departmentRows)
      ? departmentRows
      : [];

  const safeClientRows: ClientReportRow[] =
    Array.isArray(clientRows)
      ? clientRows
      : [];

  const safeEntityRows: EntityReportRow[] =
    Array.isArray(entityRows)
      ? entityRows
      : [];

  const deptData = safeDepartmentRows.map((row) => ({
    name: row.department_name || 'Unassigned',
    total_cost: Number(row.total_cost || 0),
  }));

  const clientData = safeClientRows.map((row) => ({
    name: row.client_name || 'Unassigned',
    total_cost: Number(row.total_cost || 0),
  }));

  const entityData = safeEntityRows.map((row) => ({
    name: row.entity_name || 'Unassigned',
    total_cost: Number(row.total_cost || 0),
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="text-base">
          Software Cost Breakdown
        </CardTitle>

        <CardDescription>
          Annual license spend by department, client, and entity
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">
              By Department
            </TabsTrigger>

            <TabsTrigger value="client">
              By Client
            </TabsTrigger>

            <TabsTrigger value="entity">
              By Entity
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="department"
            className="mt-4"
          >
            <CostBarChart
              data={deptData}
              dataKeyLabel="Department Cost"
            />
          </TabsContent>

          <TabsContent
            value="client"
            className="mt-4"
          >
            <CostBarChart
              data={clientData}
              dataKeyLabel="Client Cost"
            />
          </TabsContent>

          <TabsContent
            value="entity"
            className="mt-4"
          >
            <CostBarChart
              data={entityData}
              dataKeyLabel="Entity Cost"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
