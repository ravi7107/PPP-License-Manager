import { Asset } from '@/lib/api/assets.api';
import { LicensePurchase } from '@/lib/api/license-purchases.api';
import { AllocationRequest } from '@/lib/api/allocation-requests.api';

/*
 * Pure aggregation functions that turn the app's real, already-loaded API
 * data (Assets, License Purchases, Allocation Requests) into the shapes the
 * Dashboard's KPI cards and Recharts components expect.
 *
 * This replaces frontend/lib/mock/dashboard.ts for the hardware-utilization
 * and license-cost/renewal sections of the Dashboard - no fabricated
 * numbers, only what's actually in the database. Everything here is a
 * plain synchronous function over arrays the caller has already fetched,
 * so it's trivial to unit-test and has no knowledge of how the data was
 * loaded.
 */

const MS_PER_DAY = 1000 * 60 * 60 * 24;

// A license/renewal is "expiring soon" within this many days - matches the
// threshold the KPI card and action widgets use elsewhere in the app.
const EXPIRY_WARNING_DAYS = 30;

// A software title is flagged "low availability" once its remaining pool
// (of already-created license seats) drops to or below this fraction.
const LOW_AVAILABILITY_RATIO = 0.15;

export interface AssetKpis {
  totalAssets: number;
  allocatedAssets: number;
  availableAssets: number;
  assetsUnderMaintenance: number;
}

export function computeAssetKpis(assets: Asset[]): AssetKpis {
  const activeAssets = assets.filter((a) => a.isActive);

  return {
    totalAssets: activeAssets.length,
    allocatedAssets: activeAssets.filter((a) => a.status === 'Assigned')
      .length,
    availableAssets: activeAssets.filter((a) => a.status === 'Available')
      .length,
    assetsUnderMaintenance: activeAssets.filter(
      (a) => a.status === 'Maintenance'
    ).length,
  };
}

export interface DepartmentAssetsRow {
  department: string;
  count: number;
}

export function computeDepartmentWiseAssetsChartData(
  assets: Asset[]
): DepartmentAssetsRow[] {
  const counts = new Map<string, number>();

  for (const asset of assets) {
    if (!asset.isActive) continue;

    const department = asset.departmentName || 'Unassigned';
    counts.set(department, (counts.get(department) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([department, count]) => ({ department, count }))
    .sort((a, b) => b.count - a.count);
}

export interface AssetTypeRow {
  type: string;
  count: number;
}

export function computeAssetTypeChartData(assets: Asset[]): AssetTypeRow[] {
  const counts = new Map<string, number>();

  for (const asset of assets) {
    if (!asset.isActive) continue;

    counts.set(asset.assetType, (counts.get(asset.assetType) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);
}

export interface LicenseKpis {
  totalLicenseSeats: number;
  availableLicenseSeats: number;
  expiringLicenses: number;
  totalLicenseSpend: number;
  spendCurrency: string;
}

export function computeLicenseKpis(
  purchases: LicensePurchase[]
): LicenseKpis {
  const activePurchases = purchases.filter((p) => p.isActive);

  const totalLicenseSeats = activePurchases.reduce(
    (sum, p) => sum + (p.totalLicenses ?? 0),
    0
  );

  // Seats that can actually be allocated right now (created AND free),
  // not just "quota not yet turned into a seat-row" - a purchase where
  // every seat has been created but several were later released is
  // still allocatable, and this KPI should reflect that.
  const availableLicenseSeats = activePurchases.reduce(
    (sum, p) => sum + (p.freeToAllocateLicenses ?? p.availableLicenses ?? 0),
    0
  );

  const now = new Date();

  const expiringLicenses = activePurchases.filter((p) => {
    if (!p.expiryDate) return false;

    const days = daysUntil(p.expiryDate, now);
    return days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;
  }).length;

  const totalLicenseSpend = activePurchases.reduce(
    (sum, p) => sum + (p.cost ?? 0),
    0
  );

  const currencies = new Set(
    activePurchases.filter((p) => (p.cost ?? 0) > 0).map((p) => p.currency || 'INR')
  );

  const spendCurrency =
    currencies.size === 1 ? Array.from(currencies)[0] : 'INR';

  return {
    totalLicenseSeats,
    availableLicenseSeats,
    expiringLicenses,
    totalLicenseSpend,
    spendCurrency,
  };
}

export interface UtilizationRow {
  name: string;
  used: number;
  available: number;
}

// Groups license purchases by software title and rolls up seat counts -
// a title can have several purchase batches over time, so this sums across
// all of them. "used" is created-but-not-available seats (i.e. currently
// issued/checked out); "available" is the unissued pool.
export function computeLicenseUtilizationChartData(
  purchases: LicensePurchase[]
): UtilizationRow[] {
  const bySoftware = new Map<string, { created: number; available: number }>();

  for (const p of purchases) {
    if (!p.isActive) continue;

    const key = p.softwareName || 'Unknown';
    const existing = bySoftware.get(key) ?? { created: 0, available: 0 };

    existing.created += p.createdLicenses ?? 0;
    existing.available += p.availableLicenses ?? 0;

    bySoftware.set(key, existing);
  }

  return Array.from(bySoftware.entries())
    .map(([name, { created, available }]) => ({
      name,
      used: Math.max(created - available, 0),
      available,
    }))
    .filter((row) => row.used + row.available > 0)
    .sort((a, b) => b.used + b.available - (a.used + a.available))
    .slice(0, 8);
}

export interface CostRow {
  label: string;
  cost: number;
}

function computeCostBy(
  purchases: LicensePurchase[],
  getLabel: (p: LicensePurchase) => string
): CostRow[] {
  const totals = new Map<string, number>();

  for (const p of purchases) {
    if (!p.isActive) continue;
    if (!p.cost) continue;

    const label = getLabel(p) || 'Unassigned';
    totals.set(label, (totals.get(label) ?? 0) + p.cost);
  }

  return Array.from(totals.entries())
    .map(([label, cost]) => ({ label, cost }))
    .sort((a, b) => b.cost - a.cost);
}

export function computeCostByEntityChartData(
  purchases: LicensePurchase[]
): { entity: string; cost: number }[] {
  return computeCostBy(purchases, (p) => p.companyName || 'Unassigned').map(
    (row) => ({ entity: row.label, cost: row.cost })
  );
}

export function computeCostByClientChartData(
  purchases: LicensePurchase[]
): { client: string; cost: number }[] {
  return computeCostBy(purchases, (p) => p.clientName || 'Internal').map(
    (row) => ({ client: row.label, cost: row.cost })
  );
}

function daysUntil(dateStr: string, now: Date): number | null {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;

  return Math.round((date.getTime() - now.getTime()) / MS_PER_DAY);
}

export interface ExpiryTimelineRow {
  name: string;
  daysToExpiry: number;
}

// Nearest-first list of upcoming (and just-lapsed) renewals - the timeline
// chart is meant to draw the eye to what needs attention soonest.
export function computeSoftwareExpiryTimelineChartData(
  purchases: LicensePurchase[]
): ExpiryTimelineRow[] {
  const now = new Date();

  return purchases
    .filter((p) => p.isActive && p.expiryDate)
    .map((p) => ({
      name: p.softwareName || 'Unknown',
      daysToExpiry: daysUntil(p.expiryDate as string, now) ?? 0,
    }))
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry)
    .slice(0, 8);
}

export interface LowAvailabilityLicense {
  id: number;
  softwareName: string;
  totalSeats: number;
  seatsUsed: number;
}

export function computeLowAvailabilityLicenses(
  purchases: LicensePurchase[]
): LowAvailabilityLicense[] {
  return purchases
    .filter((p) => p.isActive && (p.totalLicenses ?? 0) > 0)
    .filter((p) => {
      const free = p.freeToAllocateLicenses ?? p.availableLicenses ?? 0;
      const ratio = free / (p.totalLicenses ?? 1);
      return ratio <= LOW_AVAILABILITY_RATIO;
    })
    .map((p) => {
      const free = p.freeToAllocateLicenses ?? p.availableLicenses ?? 0;
      return {
        id: p.id,
        softwareName: p.softwareName || 'Unknown',
        totalSeats: p.totalLicenses ?? 0,
        seatsUsed: (p.totalLicenses ?? 0) - free,
      };
    })
    .sort((a, b) => a.totalSeats - a.seatsUsed - (b.totalSeats - b.seatsUsed))
    .slice(0, 5);
}

export interface ExpiringLicenseRow {
  id: number;
  softwareName: string;
  renewalDate: string;
}

export function computeExpiringLicensesList(
  purchases: LicensePurchase[]
): ExpiringLicenseRow[] {
  const now = new Date();

  return purchases
    .filter((p) => p.isActive && p.expiryDate)
    .filter((p) => {
      const days = daysUntil(p.expiryDate as string, now);
      return days !== null && days >= 0 && days <= EXPIRY_WARNING_DAYS;
    })
    .sort(
      (a, b) =>
        new Date(a.expiryDate as string).getTime() -
        new Date(b.expiryDate as string).getTime()
    )
    .slice(0, 5)
    .map((p) => ({
      id: p.id,
      softwareName: p.softwareName || 'Unknown',
      renewalDate: new Date(p.expiryDate as string).toLocaleDateString(
        'en-IN',
        { day: 'numeric', month: 'short', year: 'numeric' }
      ),
    }));
}

export interface MonthlyRequestRow {
  month: string;
  requests: number;
}

// Last 6 months of allocation-request volume, oldest first - built from
// createdAt on the real AllocationRequest records (no synthetic history).
export function computeMonthlyRequestTrend(
  requests: AllocationRequest[]
): MonthlyRequestRow[] {
  const now = new Date();
  const buckets: { key: string; label: string }[] = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('en-IN', { month: 'short' }),
    });
  }

  const counts = new Map<string, number>(buckets.map((b) => [b.key, 0]));

  for (const req of requests) {
    if (!req.createdAt) continue;

    const d = new Date(req.createdAt);
    if (Number.isNaN(d.getTime())) continue;

    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return buckets.map((b) => ({
    month: b.label,
    requests: counts.get(b.key) ?? 0,
  }));
}

export interface RequestStatusRow {
  status: string;
  count: number;
}

export function computeRequestsByStatus(
  requests: AllocationRequest[]
): RequestStatusRow[] {
  const counts = new Map<string, number>();

  for (const req of requests) {
    const status = req.status || 'Unknown';
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  // Fixed, sensible ordering when present, falling back to alphabetical
  // for any status this app doesn't already know about.
  const order = ['Pending', 'Approved', 'Rejected'];

  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => {
      const ai = order.indexOf(a.status);
      const bi = order.indexOf(b.status);
      if (ai === -1 && bi === -1) return a.status.localeCompare(b.status);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
}
