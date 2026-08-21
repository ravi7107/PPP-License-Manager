import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Percent,
  UserX,
  UploadCloud,
  AlertCircle,
} from 'lucide-react';

import { KpiCard } from '@/components/layout/kpi-card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { getSoftware, Software } from '@/lib/api/software.api';
import {
  getUtilizationOverview,
  getUtilizationTierDistribution,
  getUtilizationDepartmentConcentration,
  getUtilizationProductUsage,
  getUtilizationLeastUsedUsers,
  getUtilizationUsageDistribution,
  UtilizationOverview,
  UtilizationTierDistributionRow,
  UtilizationDepartmentConcentrationRow,
  UtilizationProductUsageRow,
  UtilizationLeastUsedUserRow,
  UtilizationUsageDistributionBucket,
} from '@/lib/api/utilization.api';

import { TierDistributionChart } from './components/tier-distribution-chart';
import { DepartmentConcentrationChart } from './components/department-concentration-chart';
import { ProductUsageChart } from './components/product-usage-chart';
import { ProductUsageExtremesTable } from './components/product-usage-extremes-table';
import { LeastUsedUsersChart } from './components/least-used-users-chart';
import { UsageDistributionChart } from './components/usage-distribution-chart';

/*
 * Pass-1 Executive Dashboard for the Software License Utilization &
 * Analytics module - see the module's plan for why exactly these
 * charts + KPI row were chosen ("every visualization needs a business
 * purpose"). Every number here traces back to real uploaded/processed
 * data (see UtilizationAnalysisService) - reasons for an unavailable
 * KPI are shown as a hint rather than silently defaulting to 0/blank.
 *
 * Usage by Product is given its own full-width row above the rest -
 * on real-world vendor exports, activity/access-option fields are
 * often flat (e.g. every row "active"/"Subscription") and department
 * fields are often noisy vendor-internal labels, which leaves the
 * tier/department charts below with comparatively little to show;
 * product is usually the one dimension with clean, real spread.
 */
export default function UtilizationDashboardPage() {
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [softwareId, setSoftwareId] = useState<number | null>(null);

  const [overview, setOverview] = useState<UtilizationOverview | null>(null);
  const [tiers, setTiers] = useState<UtilizationTierDistributionRow[]>([]);
  const [departments, setDepartments] = useState<UtilizationDepartmentConcentrationRow[]>([]);
  const [products, setProducts] = useState<UtilizationProductUsageRow[]>([]);
  const [leastUsed, setLeastUsed] = useState<UtilizationLeastUsedUserRow[]>([]);
  const [usageDistribution, setUsageDistribution] = useState<UtilizationUsageDistributionBucket[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSoftware().then(setSoftwareList).catch(() => {
      /* software list is a convenience filter only - not fatal if it fails */
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      getUtilizationOverview(softwareId),
      getUtilizationTierDistribution(softwareId),
      getUtilizationDepartmentConcentration(softwareId),
      getUtilizationProductUsage(softwareId),
      getUtilizationLeastUsedUsers(softwareId, null, 15),
      getUtilizationUsageDistribution(softwareId),
    ])
      .then(([o, t, d, p, l, u]) => {
        if (cancelled) return;
        setOverview(o);
        setTiers(t);
        setDepartments(d);
        setProducts(p);
        setLeastUsed(l);
        setUsageDistribution(u);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load utilization analytics. Please try again.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [softwareId]);

  return (
    <div className="flex flex-col gap-5">
      <div className="nova-cmdbar">
        <div>
          <h1 className="nova-cmdbar-title">License Utilization Analytics</h1>
          <p className="nova-cmdbar-desc">
            What we own, what we use, what we&apos;re wasting - from real uploaded vendor usage reports.
          </p>
        </div>

        <div className="nova-cmdbar-actions flex items-center gap-2">
          <Select
            value={softwareId ? String(softwareId) : 'all'}
            onValueChange={(v) => setSoftwareId(v === 'all' ? null : Number(v))}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All software" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All software</SelectItem>
              {softwareList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button asChild variant="outline" size="sm">
            <Link to="/utilization/upload">
              <UploadCloud className="mr-1.5 h-4 w-4" />
              Upload Report
            </Link>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {!loading && !error && overview && !overview.hasData ? (
        <div className="nova-panel">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <UploadCloud className="h-8 w-8 text-muted-foreground" />
            <p className="max-w-md text-sm text-muted-foreground">
              No processed utilization reports yet. Upload a vendor usage export (e.g. an Autodesk
              Account report) to see analytics here.
            </p>
            <Button asChild size="sm">
              <Link to="/utilization/upload">
                <UploadCloud className="mr-1.5 h-4 w-4" />
                Upload a Report
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          {overview && overview.hasData && (
            <p className="text-xs text-muted-foreground">
              Reporting period: {overview.reportingPeriodStart} to {overview.reportingPeriodEnd} ·{' '}
              {overview.uploadBatchCount} upload{overview.uploadBatchCount === 1 ? '' : 's'} ·{' '}
              {overview.dataCompletenessPct}% of uploaded rows usable for calculation
              {overview.rowsExcludedFromCalculation > 0
                ? ` (${overview.rowsExcludedFromCalculation} rows excluded - missing usage data)`
                : ''}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              title="Total Licenses"
              value={overview?.totalLicenses ?? '—'}
              icon={Boxes}
              hint={overview?.totalLicensesUnavailableReason ?? undefined}
              tone="default"
            />
            <KpiCard
              title="Assigned Seats"
              value={overview?.assignedSeats ?? 0}
              icon={UserCheck}
              tone="default"
            />
            <KpiCard
              title="Used Seats"
              value={overview?.usedSeats ?? 0}
              icon={CheckCircle2}
              tone="success"
            />
            <KpiCard
              title="Unused / Wasted"
              value={overview?.unusedSeats ?? 0}
              icon={AlertTriangle}
              tone={overview && overview.unusedSeats > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              title="Utilization %"
              value={overview?.utilizationPct ?? '—'}
              suffix={overview?.utilizationPct != null ? '%' : undefined}
              icon={Percent}
              hint={overview?.utilizationPctUnavailableReason ?? undefined}
              tone="default"
            />
            <KpiCard
              title="Never-Used Users"
              value={overview?.neverUsedUserCount ?? 0}
              icon={UserX}
              tone={overview && overview.neverUsedUserCount > 0 ? 'danger' : 'default'}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ProductUsageChart rows={products} />
            <ProductUsageExtremesTable rows={products} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <TierDistributionChart rows={tiers} />
            <DepartmentConcentrationChart rows={departments} />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LeastUsedUsersChart rows={leastUsed} />
            <UsageDistributionChart rows={usageDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
