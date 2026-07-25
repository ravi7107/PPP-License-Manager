import { useOutletContext } from 'react-router-dom';
import { useLoadAction } from '@/lib/uibakery';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Pie, PieChart, Cell, Line, LineChart, LabelList } from 'recharts';
import { HardDrive, KeySquare, Share2, ClipboardCheck, AlertTriangle, PackageCheck, PackageOpen, Wrench } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartConfig } from '@/components/ui/chart';
import { KpiCard } from '@/components/layout/kpi-card';
import { KpiCardSkeleton } from '@/components/layout/kpi-card-skeleton';
import { AppRole, canManage } from '@/lib/auth/roles';
import loadPendingApprovalsCount from '@/actions/requests/loadPendingApprovalsCount';
import loadPendingApprovalsForDashboard from '@/actions/requests/loadPendingApprovalsForDashboard';
import {
  getDashboardKpis,
  getLicenseUtilizationChartData,
  getCostByEntityChartData,
  getCostByClientChartData,
  getDepartmentWiseAssetsChartData,
  getMonthlyAllocationTrendChartData,
  getSoftwareExpiryTimelineChartData,
  getPendingApprovalTrendChartData,
  getLowAvailabilityLicenses,
  getExpiringLicensesList,
} from '@/lib/mock/dashboard';

interface PendingApprovalDashboardRow {
  id: number;
  request_type: string;
  requester_name: string | null;
  department_name: string | null;
  software_name: string | null;
  created_at: string;
}

const utilizationConfig: ChartConfig = {
  used: { label: 'Seats Used', color: 'var(--chart-1)' },
  available: { label: 'Seats Available', color: 'var(--chart-2)' },
};

const costEntityConfig: ChartConfig = {
  cost: { label: 'Cost ($)', color: 'var(--chart-1)' },
};

const costClientConfig: ChartConfig = {
  cost: { label: 'Cost ($)', color: 'var(--chart-2)' },
};

const departmentAssetsConfig: ChartConfig = {
  count: { label: 'Assets', color: 'var(--chart-3)' },
};

const allocationTrendConfig: ChartConfig = {
  allocations: { label: 'Allocations', color: 'var(--chart-1)' },
};

const approvalTrendConfig: ChartConfig = {
  pending: { label: 'Pending Approvals', color: 'var(--chart-4)' },
};

const expiryTimelineConfig: ChartConfig = {
  daysToExpiry: { label: 'Days to Expiry', color: 'var(--chart-5)' },
};

const PIE_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

export default function DashboardPage() {
  const { roles } = useOutletContext<{ roles: AppRole[] }>();
  const kpis = getDashboardKpis();
  const showActionableWidgets = canManage(roles);

  const utilizationData = getLicenseUtilizationChartData();
  const costEntityData = getCostByEntityChartData();
  const costClientData = getCostByClientChartData();
  const departmentAssetsData = getDepartmentWiseAssetsChartData();
  const allocationTrendData = getMonthlyAllocationTrendChartData();
  const expiryTimelineData = getSoftwareExpiryTimelineChartData();
  const approvalTrendData = getPendingApprovalTrendChartData();

  const lowAvailability = getLowAvailabilityLicenses();
  const expiringLicenses = getExpiringLicensesList();

  const [pendingCountRows, pendingCountLoading]: [{ pending_count: number }[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadPendingApprovalsCount,
    [],
    {},
  );
  const pendingApprovalsCount = pendingCountRows?.[0]?.pending_count ?? 0;

  const [pendingApprovals, pendingApprovalsLoading]: [PendingApprovalDashboardRow[], boolean, Error | null, () => Promise<void>] = useLoadAction(
    loadPendingApprovalsForDashboard,
    [],
    {},
  );

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground md:text-2xl">Operations Dashboard</h2>
        <p className="text-sm text-muted-foreground">Overview of hardware assets, software licenses, and allocation activity across PPS.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Assets" value={kpis.totalAssets} icon={HardDrive} hint="All tracked hardware" />
        <KpiCard title="Allocated Assets" value={kpis.allocatedAssets} icon={PackageCheck} hint="Currently in active use" />
        <KpiCard title="Available Assets" value={kpis.availableAssets} icon={PackageOpen} hint="Ready for assignment" />
        <KpiCard
          title="Assets Under Maintenance"
          value={kpis.assetsUnderMaintenance}
          icon={Wrench}
          hint="In repair / servicing"
          tone={kpis.assetsUnderMaintenance > 0 ? 'warning' : 'default'}
        />
        <KpiCard title="Software Licenses" value={kpis.totalLicenseSeats} icon={KeySquare} hint="Total seats across all software" />
        <KpiCard title="Available Licenses" value={kpis.availableLicenseSeats} icon={Share2} hint="Unassigned seats in pool" />
        {pendingCountLoading ? (
          <KpiCardSkeleton />
        ) : (
          <KpiCard
            title="Pending Requests"
            value={pendingApprovalsCount}
            icon={ClipboardCheck}
            hint="Awaiting IT review"
            tone={pendingApprovalsCount > 0 ? 'warning' : 'default'}
          />
        )}
        <KpiCard
          title="Expiring Licenses"
          value={kpis.expiringLicenses}
          icon={AlertTriangle}
          hint="Renewing within 30 days"
          tone={kpis.expiringLicenses > 0 ? 'danger' : 'default'}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">License Utilization</CardTitle>
            <CardDescription>Seats used vs. available per software title</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={utilizationConfig} className="h-72 w-full">
              <BarChart data={utilizationData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-20} textAnchor="end" height={60} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="used" stackId="a" fill="var(--color-used)" radius={[0, 0, 4, 4]} />
                <Bar dataKey="available" stackId="a" fill="var(--color-available)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Software Cost by Entity</CardTitle>
            <CardDescription>Annual license spend allocated by business entity</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={costEntityConfig} className="h-64 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={costEntityData} dataKey="cost" nameKey="entity" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {costEntityData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-3 space-y-1.5">
              {costEntityData.map((row, index) => (
                <li key={row.entity} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{row.entity}</span>
                  </span>
                  <span className="font-medium">${row.cost.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Software Cost by Client</CardTitle>
            <CardDescription>Annual license spend allocated by client project</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={costClientConfig} className="h-64 w-full">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent />} />
                <Pie data={costClientData} dataKey="cost" nameKey="client" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {costClientData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-3 space-y-1.5">
              {costClientData.map((row, index) => (
                <li key={row.client} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                      style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{row.client}</span>
                  </span>
                  <span className="font-medium">${row.cost.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Department-wise Assets</CardTitle>
            <CardDescription>Hardware asset distribution by team/department</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={departmentAssetsConfig} className="h-72 w-full">
              <BarChart data={departmentAssetsData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="department" tickLine={false} axisLine={false} tickMargin={8} interval={0} angle={-15} textAnchor="end" height={55} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Allocation Trend</CardTitle>
            <CardDescription>License seats allocated per month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={allocationTrendConfig} className="h-72 w-full">
              <LineChart data={allocationTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="allocations" stroke="var(--color-allocations)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending Approval Trend</CardTitle>
            <CardDescription>Open requests awaiting decision, month over month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={approvalTrendConfig} className="h-72 w-full">
              <LineChart data={approvalTrendData}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="pending" stroke="var(--color-pending)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Software Expiry Timeline</CardTitle>
            <CardDescription>Days remaining until each license renews or expires</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={expiryTimelineConfig} className="h-72 w-full">
              <BarChart data={expiryTimelineData} layout="vertical" margin={{ left: 16 }}>
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} width={110} fontSize={11} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="daysToExpiry" fill="var(--color-daysToExpiry)" radius={[0, 4, 4, 0]}>
                  <LabelList dataKey="daysToExpiry" position="right" fontSize={11} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {showActionableWidgets && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>Requests awaiting your review</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {pendingApprovalsLoading && <p className="text-sm text-muted-foreground">Loading pending requests…</p>}
              {!pendingApprovalsLoading && pendingApprovals.length === 0 && <p className="text-sm text-muted-foreground">No pending requests.</p>}
              {!pendingApprovalsLoading && pendingApprovals.map((req) => (
                <div key={req.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{req.software_name ?? 'Reallocation / release request'}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.request_type} · {req.requester_name ?? 'Unknown'} ({req.department_name ?? 'Unassigned'})
                    </p>
                  </div>
                  <Badge variant="outline">{req.request_type === 'New License' ? 'New' : req.request_type === 'Release' ? 'Release' : 'Reallocation'}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Availability &amp; Expiring Licenses</CardTitle>
              <CardDescription>Licenses needing attention soon</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {lowAvailability.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{l.softwareName}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.totalSeats - l.seatsUsed} seat(s) left of {l.totalSeats}
                    </p>
                  </div>
                  <Badge variant="secondary">Low availability</Badge>
                </div>
              ))}
              {expiringLicenses.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="text-sm font-medium">{l.softwareName}</p>
                    <p className="text-xs text-muted-foreground">Renews {l.renewalDate}</p>
                  </div>
                  <Badge variant="destructive">Expiring soon</Badge>
                </div>
              ))}
              {lowAvailability.length === 0 && expiringLicenses.length === 0 && (
                <p className="text-sm text-muted-foreground">No licenses need attention right now.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
