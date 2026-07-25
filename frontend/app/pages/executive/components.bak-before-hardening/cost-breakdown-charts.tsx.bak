import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { DepartmentCostRow, EntityReportRow, ClientReportRow } from '@/app/pages/reports/types';

const costConfig: ChartConfig = {
  total_cost: { label: 'Cost ($)', color: 'var(--chart-1)' },
};

function CostBarChart({ data, dataKeyLabel }: { data: { name: string; total_cost: number }[]; dataKeyLabel: string }) {
  return (
    <ChartContainer config={costConfig} className="h-72 w-full">
      <BarChart data={data} layout="vertical" margin={{ left: 12 }}>
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={(v) => `$${Number(v).toLocaleString()}`} fontSize={11} />
        <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} fontSize={11} />
        <ChartTooltip content={<ChartTooltipContent labelKey="name" formatter={(value) => [`$${Number(value).toLocaleString()}`, dataKeyLabel]} />} />
        <Bar dataKey="total_cost" fill="var(--color-total_cost)" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function CostBreakdownCharts({
  departmentRows,
  clientRows,
  entityRows,
}: {
  departmentRows: DepartmentCostRow[];
  clientRows: ClientReportRow[];
  entityRows: EntityReportRow[];
}) {
  const deptData = departmentRows.map((r) => ({ name: r.department_name, total_cost: Number(r.total_cost) }));
  const clientData = clientRows.map((r) => ({ name: r.client_name, total_cost: Number(r.total_cost) }));
  const entityData = entityRows.map((r) => ({ name: r.entity_name, total_cost: Number(r.total_cost) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Software Cost Breakdown</CardTitle>
        <CardDescription>Annual license spend by department, client, and entity</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">By Department</TabsTrigger>
            <TabsTrigger value="client">By Client</TabsTrigger>
            <TabsTrigger value="entity">By Entity</TabsTrigger>
          </TabsList>
          <TabsContent value="department">
            <CostBarChart data={deptData} dataKeyLabel="Department Cost" />
          </TabsContent>
          <TabsContent value="client">
            <CostBarChart data={clientData} dataKeyLabel="Client Cost" />
          </TabsContent>
          <TabsContent value="entity">
            <CostBarChart data={entityData} dataKeyLabel="Entity Cost" />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
