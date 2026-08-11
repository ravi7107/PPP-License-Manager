import { useEffect, useState } from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';

import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Cell,
  Line,
  LineChart,
  LabelList,
} from 'recharts';

import {
  HardDrive,
  KeySquare,
  Share2,
  ClipboardCheck,
  AlertTriangle,
  PackageCheck,
  PackageOpen,
  Wrench,
  Activity,
  RefreshCw,
  Gauge,
  TrendingUp,
  Landmark,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';

import { Badge } from '@/components/ui/badge';

import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from '@/components/ui/chart';

import { KpiCard } from '@/components/layout/kpi-card';
import {
  KpiCardSkeleton,
  ChartCardSkeleton,
} from '@/components/layout/kpi-card-skeleton';

import { AppRole, canAccessModule, canManage } from '@/lib/auth/roles';
import { getFirstAccessiblePath } from '@/lib/nav-config';
import { useAuth } from '@/lib/auth/auth-context';

import {
  getAllocationRequests,
  AllocationRequest,
} from '@/lib/api/allocation-requests.api';

import { getAssets, Asset } from '@/lib/api/assets.api';

import {
  getLicensePurchases,
  LicensePurchase,
} from '@/lib/api/license-purchases.api';

import {
  computeAssetKpis,
  computeDepartmentWiseAssetsChartData,
  computeLicenseKpis,
  computeLicenseUtilizationChartData,
  computeSoftwareExpiryTimelineChartData,
  computeLowAvailabilityLicenses,
  computeExpiringLicensesList,
  computeMonthlyRequestTrend,
  computeRequestsByStatus,
} from '@/lib/dashboard/compute';


const utilizationConfig: ChartConfig = {
  used: {
    label: 'Seats Used',
    color: 'var(--chart-1)',
  },
  available: {
    label: 'Seats Available',
    color: 'var(--chart-2)',
  },
};

const departmentAssetsConfig: ChartConfig = {
  count: {
    label: 'Assets',
    color: 'var(--chart-3)',
  },
};

const requestTrendConfig: ChartConfig = {
  requests: {
    label: 'Requests Submitted',
    color: 'var(--chart-1)',
  },
};

const requestStatusConfig: ChartConfig = {
  count: {
    label: 'Requests',
    color: 'var(--chart-4)',
  },
};

const expiryTimelineConfig: ChartConfig = {
  daysToExpiry: {
    label: 'Days to Expiry',
    color: 'var(--chart-5)',
  },
};

const PIE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
];

const STATUS_COLORS: Record<string, string> = {
  Pending: 'var(--chart-4)',
  Approved: 'var(--chart-2)',
  Rejected: 'var(--chart-5)',
};


export default function DashboardPage() {
  const { roles, accessOverride } = useOutletContext<{
    roles: AppRole[];
    accessOverride: Record<string, AppRole[]> | null;
  }>();

  // Team Lead/Manager accounts only see their own Entity's hardware and
  // license data (enforced server-side - see EntityScopeHelper in the
  // backend). Surfacing the entity name here just makes that visible
  // instead of leaving a TL/Manager wondering why counts look smaller
  // than a colleague's.
  const { user } = useAuth();
  const companyName = user?.companyName;

  // This dashboard is scoped to Team Lead/Manager plus the admin roles -
  // an Employee landing on "/" (the index route) gets sent to whatever
  // module they actually have access to instead of seeing a page meant
  // for their leads/managers.
  const hasDashboardAccess = canAccessModule(
    roles,
    'dashboard',
    accessOverride
  );

  const showActionableWidgets = canManage(roles);


  /*
   * CORE BUSINESS DATA - real, live API data (no mocks).
   *
   * Assets and License Purchases power the hardware-utilization and
   * license-cost/renewal sections of the dashboard. Both are fetched once
   * on mount and aggregated client-side via lib/dashboard/compute.ts -
   * the dataset sizes this app deals with make that far simpler (and far
   * easier to verify correct) than standing up dedicated aggregation
   * endpoints.
   */
  const [assets, setAssets] = useState<Asset[]>([]);
  const [licensePurchases, setLicensePurchases] = useState<
    LicensePurchase[]
  >([]);
  const [coreDataLoading, setCoreDataLoading] = useState(true);
  const [coreDataError, setCoreDataError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasDashboardAccess) {
      setCoreDataLoading(false);
      return;
    }

    let mounted = true;

    async function loadCoreData() {
      try {
        setCoreDataLoading(true);
        setCoreDataError(null);

        const [assetsResult, purchasesResult] = await Promise.all([
          getAssets(),
          getLicensePurchases(),
        ]);

        if (!mounted) return;

        setAssets(Array.isArray(assetsResult) ? assetsResult : []);
        setLicensePurchases(
          Array.isArray(purchasesResult) ? purchasesResult : []
        );
      } catch (error) {
        console.error('Failed to load dashboard data:', error);

        if (mounted) {
          setAssets([]);
          setLicensePurchases([]);
          setCoreDataError('Unable to load hardware/license data.');
        }
      } finally {
        if (mounted) {
          setCoreDataLoading(false);
        }
      }
    }

    loadCoreData();

    return () => {
      mounted = false;
    };
  }, []);

  const assetKpis = computeAssetKpis(assets);
  const licenseKpis = computeLicenseKpis(licensePurchases);

  const utilizationData = computeLicenseUtilizationChartData(
    licensePurchases
  );
  const departmentAssetsData = computeDepartmentWiseAssetsChartData(assets);
  const expiryTimelineData = computeSoftwareExpiryTimelineChartData(
    licensePurchases
  );
  const lowAvailability = computeLowAvailabilityLicenses(licensePurchases);
  const expiringLicenses = computeExpiringLicensesList(licensePurchases);

  const assetUtilizationRate =
    assetKpis.totalAssets > 0
      ? Math.round(
          (assetKpis.allocatedAssets / assetKpis.totalAssets) * 100
        )
      : 0;

  const licenseUtilizationRate =
    licenseKpis.totalLicenseSeats > 0
      ? Math.round(
          ((licenseKpis.totalLicenseSeats - licenseKpis.availableLicenseSeats) /
            licenseKpis.totalLicenseSeats) *
            100
        )
      : 0;


  /*
   * REAL BACKEND DATA
   *
   * Pending allocation/license requests are loaded from the ASP.NET Core
   * API. This also powers the "Monthly Request Volume" and "Requests by
   * Status" charts below - real submission history, not a mock trend.
   */
  const [
    allocationRequests,
    setAllocationRequests,
  ] = useState<AllocationRequest[]>([]);

  const [
    pendingApprovalsLoading,
    setPendingApprovalsLoading,
  ] = useState(true);

  const [
    pendingApprovalsError,
    setPendingApprovalsError,
  ] = useState<string | null>(null);


  useEffect(() => {
    let mounted = true;

    async function loadRequests() {
      try {
        setPendingApprovalsLoading(true);
        setPendingApprovalsError(null);

        const result =
          await getAllocationRequests();

        if (!mounted) {
          return;
        }

        /*
         * Protect the dashboard from malformed
         * or unexpected API responses.
         */
        if (Array.isArray(result)) {
          setAllocationRequests(result);
        } else {
          console.error(
            'Allocation request API did not return an array:',
            result
          );

          setAllocationRequests([]);
        }
      } catch (error) {
        console.error(
          'Failed to load allocation requests:',
          error
        );

        if (mounted) {
          setAllocationRequests([]);

          setPendingApprovalsError(
            'Unable to load pending requests.'
          );
        }
      } finally {
        if (mounted) {
          setPendingApprovalsLoading(false);
        }
      }
    }

    loadRequests();

    return () => {
      mounted = false;
    };
  }, []);


  /*
   * Only Pending requests should appear on
   * the Dashboard approval widget.
   */
  const pendingRequests =
    allocationRequests.filter(
      (request) =>
        String(request.status ?? '')
          .trim()
          .toLowerCase() === 'pending'
    );


  /*
   * Dashboard KPI count.
   */
  const pendingApprovalsCount =
    pendingRequests.length;


  /*
   * Only show the latest six requests
   * inside the dashboard widget.
   */
  const pendingApprovals =
    pendingRequests.slice(0, 6);


  /*
   * Reuse the same API loading state
   * for the Pending Requests KPI.
   */
  const pendingCountLoading =
    pendingApprovalsLoading;

  const requestTrendData = computeMonthlyRequestTrend(allocationRequests);
  const requestStatusData = computeRequestsByStatus(allocationRequests);


  if (!hasDashboardAccess) {
    const fallbackPath =
      getFirstAccessiblePath(roles, accessOverride, ['dashboard']) ??
      '/purchase-requisitions';

    return <Navigate to={fallbackPath} replace />;
  }


  return (
    <div className="flex flex-col gap-4 md:gap-6">

      {/* MODERN OPERATIONS HEADER */}

      <div className="relative overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="absolute inset-x-0 top-0 h-[3px] bg-primary" />

        <div className="flex flex-col gap-5 p-5 md:p-6 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">

              <Badge
                variant="outline"
                className="gap-1.5 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-40" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>

                Operational
              </Badge>

              <Badge variant="secondary">
                IT Operations
              </Badge>

              {companyName && (
                <Badge variant="outline" className="gap-1.5">
                  <Landmark className="h-3 w-3" />
                  {companyName}
                </Badge>
              )}

            </div>

            <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              IT Operations Overview
            </h2>

            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Centralized visibility into hardware assets, software licensing,
              utilization, renewals and allocation activity across PPS.
            </p>
          </div>

          <div className="flex items-center gap-3">

            <div className="hidden rounded-lg border bg-background/70 px-4 py-2.5 sm:block">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-emerald-600" />

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Platform Status
                  </p>

                  <p className="text-sm font-semibold">
                    Systems Operational
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-sm transition-all duration-200 hover:bg-accent hover:shadow"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>

          </div>

        </div>
      </div>


      {/* EXECUTIVE SNAPSHOT - the headline numbers management scans first.
          Deliberately no cost/spend figures here - this dashboard is
          scoped to Team Lead/Manager/admins and stays utilization-focused,
          not financial. */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

        <Card className="relative overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Gauge className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Asset Utilization Rate
              </p>
              {coreDataLoading ? (
                <div className="mt-1.5 h-8 w-20 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {assetUtilizationRate}%
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {assetKpis.allocatedAssets} of {assetKpis.totalAssets} assets in active use
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                License Utilization Rate
              </p>
              {coreDataLoading ? (
                <div className="mt-1.5 h-8 w-20 animate-pulse rounded bg-muted" />
              ) : (
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  {licenseUtilizationRate}%
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {licenseKpis.totalLicenseSeats - licenseKpis.availableLicenseSeats} of {licenseKpis.totalLicenseSeats} seats issued
              </p>
            </div>
          </CardContent>
        </Card>

      </div>


      {coreDataError && (
        <p className="text-sm text-destructive">{coreDataError}</p>
      )}


      {/* KPI CARDS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {coreDataLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Total Assets"
              value={assetKpis.totalAssets}
              icon={HardDrive}
              hint="All tracked hardware"
            />

            <KpiCard
              title="Allocated Assets"
              value={assetKpis.allocatedAssets}
              icon={PackageCheck}
              hint="Currently in active use"
            />

            <KpiCard
              title="Available Assets"
              value={assetKpis.availableAssets}
              icon={PackageOpen}
              hint="Ready for assignment"
            />

            <KpiCard
              title="Assets Under Maintenance"
              value={assetKpis.assetsUnderMaintenance}
              icon={Wrench}
              hint="In repair / servicing"
              tone={
                assetKpis.assetsUnderMaintenance > 0
                  ? 'warning'
                  : 'default'
              }
            />
          </>
        )}

        {coreDataLoading ? (
          <>
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </>
        ) : (
          <>
            <KpiCard
              title="Software Licenses"
              value={licenseKpis.totalLicenseSeats}
              icon={KeySquare}
              hint="Total seats across all software"
            />

            <KpiCard
              title="Available Licenses"
              value={licenseKpis.availableLicenseSeats}
              icon={Share2}
              hint="Unassigned seats in pool"
            />
          </>
        )}


        {/* REAL PENDING REQUEST COUNT */}

        {pendingCountLoading ? (
          <KpiCardSkeleton />
        ) : (
          <KpiCard
            title="Pending Requests"
            value={pendingApprovalsCount}
            icon={ClipboardCheck}
            hint={
              pendingApprovalsError
                ? 'Unable to load requests'
                : 'Awaiting IT review'
            }
            tone={
              pendingApprovalsCount > 0
                ? 'warning'
                : 'default'
            }
          />
        )}


        {coreDataLoading ? (
          <KpiCardSkeleton />
        ) : (
          <KpiCard
            title="Expiring Licenses"
            value={licenseKpis.expiringLicenses}
            icon={AlertTriangle}
            hint="Renewing within 30 days"
            tone={
              licenseKpis.expiringLicenses > 0
                ? 'danger'
                : 'default'
            }
          />
        )}
      </div>


      {/* DASHBOARD CHARTS */}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

        {/* LICENSE UTILIZATION */}

        {coreDataLoading ? (
          <ChartCardSkeleton heightClassName="h-72" />
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              License Utilization
            </CardTitle>

            <CardDescription>
              Seats used vs. available per software title
            </CardDescription>
          </CardHeader>

          <CardContent>
            {utilizationData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No license purchases recorded yet.
              </p>
            ) : (
            <ChartContainer
              config={utilizationConfig}
              className="h-72 w-full"
            >
              <BarChart data={utilizationData}>

                <CartesianGrid vertical={false} />

                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={60}
                  fontSize={11}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <ChartTooltip
                  content={<ChartTooltipContent />}
                />

                <Bar
                  dataKey="used"
                  stackId="a"
                  fill="var(--color-used)"
                  radius={[0, 0, 4, 4]}
                />

                <Bar
                  dataKey="available"
                  stackId="a"
                  fill="var(--color-available)"
                  radius={[4, 4, 0, 0]}
                />

              </BarChart>
            </ChartContainer>
            )}
          </CardContent>
        </Card>
        )}



        {/* DEPARTMENT ASSETS */}

        {coreDataLoading ? (
          <ChartCardSkeleton heightClassName="h-72" />
        ) : (
        <Card>
          <CardHeader>

            <CardTitle className="text-base">
              Department-wise Assets
            </CardTitle>

            <CardDescription>
              Hardware asset distribution by team/department
            </CardDescription>

          </CardHeader>

          <CardContent>

            {departmentAssetsData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No hardware assets recorded yet.
              </p>
            ) : (
            <ChartContainer
              config={departmentAssetsConfig}
              className="h-72 w-full"
            >

              <BarChart
                data={departmentAssetsData}
              >

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

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <ChartTooltip
                  content={<ChartTooltipContent />}
                />

                <Bar
                  dataKey="count"
                  fill="var(--color-count)"
                  radius={[4, 4, 0, 0]}
                />

              </BarChart>

            </ChartContainer>
            )}

          </CardContent>
        </Card>
        )}


        {/* MONTHLY REQUEST VOLUME */}

        {pendingApprovalsLoading ? (
          <ChartCardSkeleton heightClassName="h-72" />
        ) : (
        <Card>
          <CardHeader>

            <CardTitle className="text-base">
              Monthly Request Volume
            </CardTitle>

            <CardDescription>
              Allocation requests submitted per month
            </CardDescription>

          </CardHeader>

          <CardContent>

            <ChartContainer
              config={requestTrendConfig}
              className="h-72 w-full"
            >

              <LineChart
                data={requestTrendData}
              >

                <CartesianGrid vertical={false} />

                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <ChartTooltip
                  content={<ChartTooltipContent />}
                />

                <Line
                  type="monotone"
                  dataKey="requests"
                  stroke="var(--color-requests)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />

              </LineChart>

            </ChartContainer>

          </CardContent>
        </Card>
        )}


        {/* REQUESTS BY STATUS */}

        {pendingApprovalsLoading ? (
          <ChartCardSkeleton heightClassName="h-72" />
        ) : (
        <Card>
          <CardHeader>

            <CardTitle className="text-base">
              Requests by Status
            </CardTitle>

            <CardDescription>
              Approval funnel across all allocation requests
            </CardDescription>

          </CardHeader>

          <CardContent>

            {requestStatusData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No allocation requests recorded yet.
              </p>
            ) : (
            <ChartContainer
              config={requestStatusConfig}
              className="h-72 w-full"
            >

              <BarChart data={requestStatusData}>

                <CartesianGrid vertical={false} />

                <XAxis
                  dataKey="status"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />

                <YAxis
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />

                <ChartTooltip
                  content={<ChartTooltipContent />}
                />

                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                >
                  {requestStatusData.map((row, index) => (
                    <Cell
                      key={index}
                      fill={
                        STATUS_COLORS[row.status] ??
                        PIE_COLORS[index % PIE_COLORS.length]
                      }
                    />
                  ))}
                </Bar>

              </BarChart>

            </ChartContainer>
            )}

          </CardContent>
        </Card>
        )}


        {/* SOFTWARE EXPIRY */}

        {coreDataLoading ? (
          <ChartCardSkeleton heightClassName="h-72" />
        ) : (
        <Card className="lg:col-span-2">

          <CardHeader>

            <CardTitle className="text-base">
              Software Expiry Timeline
            </CardTitle>

            <CardDescription>
              Days remaining until each license
              renews or expires
            </CardDescription>

          </CardHeader>

          <CardContent>

            {expiryTimelineData.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No license purchases with an expiry date on record.
              </p>
            ) : (
            <ChartContainer
              config={expiryTimelineConfig}
              className="h-72 w-full"
            >

              <BarChart
                data={expiryTimelineData}
                layout="vertical"
                margin={{ left: 16 }}
              >

                <CartesianGrid
                  horizontal={false}
                />

                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
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
                  content={<ChartTooltipContent />}
                />

                <Bar
                  dataKey="daysToExpiry"
                  fill="var(--color-daysToExpiry)"
                  radius={[0, 4, 4, 0]}
                >

                  <LabelList
                    dataKey="daysToExpiry"
                    position="right"
                    fontSize={11}
                  />

                </Bar>

              </BarChart>

            </ChartContainer>
            )}

          </CardContent>

        </Card>
        )}

      </div>


      {/* ACTIONABLE ADMIN WIDGETS */}

      {showActionableWidgets && (

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">


          {/* REAL PENDING APPROVALS */}

          <Card>

            <CardHeader>

              <CardTitle className="text-base">
                Pending Approvals
              </CardTitle>

              <CardDescription>
                Requests awaiting your review
              </CardDescription>

            </CardHeader>


            <CardContent className="flex flex-col gap-3">


              {pendingApprovalsLoading && (

                <p className="text-sm text-muted-foreground">
                  Loading pending requests…
                </p>

              )}


              {!pendingApprovalsLoading &&
                pendingApprovalsError && (

                  <p className="text-sm text-destructive">
                    {pendingApprovalsError}
                  </p>

                )}


              {!pendingApprovalsLoading &&
                !pendingApprovalsError &&
                pendingApprovals.length === 0 && (

                  <p className="text-sm text-muted-foreground">
                    No pending requests.
                  </p>

                )}


              {!pendingApprovalsLoading &&
                !pendingApprovalsError &&
                pendingApprovals.map(
                  (req) => (

                    <div
                      key={req.id}
                      className="flex items-center justify-between gap-3 rounded-md border p-3"
                    >

                      <div className="min-w-0">

                        <p className="truncate text-sm font-medium">
                          {req.softwareName ||
                            'Software allocation request'}
                        </p>


                        <p className="text-xs text-muted-foreground">

                          {req.requestedByUserName ||
                            'Unknown user'}

                          {req.requestReference
                            ? ` · ${req.requestReference}`
                            : ''}

                        </p>


                        <p className="mt-1 text-xs text-muted-foreground">

                          Required from:{' '}

                          {req.requiredFrom
                            ? new Date(
                                req.requiredFrom
                              ).toLocaleDateString()
                            : '—'}

                        </p>

                      </div>


                      <Badge
                        variant={
                          String(
                            req.priority ?? ''
                          ).toLowerCase() ===
                          'high'
                            ? 'destructive'
                            : 'outline'
                        }
                      >

                        {req.priority ||
                          'Normal'}

                      </Badge>

                    </div>

                  )
                )}

            </CardContent>

          </Card>


          {/* LOW AVAILABILITY / EXPIRING */}

          <Card>

            <CardHeader>

              <CardTitle className="text-base">
                Low Availability &amp; Expiring Licenses
              </CardTitle>

              <CardDescription>
                Licenses needing attention soon
              </CardDescription>

            </CardHeader>


            <CardContent className="flex flex-col gap-3">


              {coreDataLoading && (
                <p className="text-sm text-muted-foreground">
                  Loading license data…
                </p>
              )}


              {!coreDataLoading && lowAvailability.map((l) => (

                <div
                  key={`low-${l.id}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >

                  <div>

                    <p className="text-sm font-medium">
                      {l.softwareName}
                    </p>

                    <p className="text-xs text-muted-foreground">

                      {l.totalSeats -
                        l.seatsUsed}{' '}

                      seat(s) left of{' '}

                      {l.totalSeats}

                    </p>

                  </div>


                  <Badge variant="secondary">
                    Low availability
                  </Badge>

                </div>

              ))}


              {!coreDataLoading && expiringLicenses.map((l) => (

                <div
                  key={`expiring-${l.id}`}
                  className="flex items-center justify-between rounded-md border p-3"
                >

                  <div>

                    <p className="text-sm font-medium">
                      {l.softwareName}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      Renews {l.renewalDate}
                    </p>

                  </div>


                  <Badge variant="destructive">
                    Expiring soon
                  </Badge>

                </div>

              ))}


              {!coreDataLoading &&
                lowAvailability.length === 0 &&
                expiringLicenses.length === 0 && (

                  <p className="text-sm text-muted-foreground">
                    No licenses need attention right now.
                  </p>

                )}

            </CardContent>

          </Card>

        </div>

      )}

    </div>
  );
}
