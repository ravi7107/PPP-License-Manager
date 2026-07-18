import { hardwareAssets } from '@/lib/mock/hardware';
import { softwareLicenses } from '@/lib/mock/licenses';
import { allocations } from '@/lib/mock/allocations';
import { licenseRequests } from '@/lib/mock/requests';
import { costByEntity, costByClient } from '@/lib/mock/entities-clients';
import { monthlyAllocationTrend, pendingApprovalTrend } from '@/lib/mock/trends';

export function daysBetween(dateStr: string, from: Date = new Date()): number {
  const target = new Date(dateStr).getTime();
  const diff = target - from.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getDashboardKpis() {
  const totalAssets = hardwareAssets.length;
  const allocatedAssets = hardwareAssets.filter((a) => a.status === 'Active').length;
  const availableAssets = hardwareAssets.filter((a) => a.status !== 'Active' && a.status !== 'Retired' && a.status !== 'Decommissioned').length;
  const assetsUnderMaintenance = hardwareAssets.filter((a) => a.status === 'In Repair').length;

  const totalLicenseSeats = softwareLicenses.reduce((sum, l) => sum + l.totalSeats, 0);
  const usedLicenseSeats = softwareLicenses.reduce((sum, l) => sum + l.seatsUsed, 0);
  const availableLicenseSeats = totalLicenseSeats - usedLicenseSeats;

  const activeAllocations = allocations.filter((a) => a.status !== 'Pending Return').length;
  const pendingApprovals = licenseRequests.filter((r) => r.status === 'Pending').length;
  const expiringLicenses = softwareLicenses.filter((l) => daysBetween(l.renewalDate) <= 30 && daysBetween(l.renewalDate) >= 0).length;

  return {
    totalAssets,
    allocatedAssets,
    availableAssets,
    assetsUnderMaintenance,
    totalLicenseSeats,
    availableLicenseSeats,
    activeAllocations,
    pendingApprovals,
    expiringLicenses,
  };
}

export function getLicenseUtilizationChartData() {
  return softwareLicenses.map((l) => ({
    name: l.softwareName,
    used: l.seatsUsed,
    available: l.totalSeats - l.seatsUsed,
  }));
}

export function getCostByDepartmentChartData() {
  const byDept = new Map<string, number>();
  for (const l of softwareLicenses) {
    byDept.set(l.department, (byDept.get(l.department) ?? 0) + l.cost);
  }
  return Array.from(byDept.entries()).map(([department, cost]) => ({ department, cost }));
}

export function getCostByEntityChartData() {
  return costByEntity;
}

export function getCostByClientChartData() {
  return costByClient;
}

export function getDepartmentWiseAssetsChartData() {
  const byTeam = new Map<string, number>();
  for (const a of hardwareAssets) {
    byTeam.set(a.team, (byTeam.get(a.team) ?? 0) + 1);
  }
  return Array.from(byTeam.entries()).map(([department, count]) => ({ department, count }));
}

export function getMonthlyAllocationTrendChartData() {
  return monthlyAllocationTrend;
}

export function getPendingApprovalTrendChartData() {
  return pendingApprovalTrend;
}

export function getSoftwareExpiryTimelineChartData() {
  return softwareLicenses
    .map((l) => ({ name: l.softwareName, daysToExpiry: Math.max(daysBetween(l.renewalDate), 0) }))
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}

export function getLowAvailabilityLicenses(thresholdPct = 15) {
  return softwareLicenses.filter((l) => {
    const availablePct = ((l.totalSeats - l.seatsUsed) / l.totalSeats) * 100;
    return availablePct <= thresholdPct;
  });
}

export function getPendingApprovalsList() {
  return licenseRequests.filter((r) => r.status === 'Pending');
}

export function getExpiringLicensesList(withinDays = 30) {
  return softwareLicenses
    .filter((l) => daysBetween(l.renewalDate) <= withinDays && daysBetween(l.renewalDate) >= 0)
    .sort((a, b) => daysBetween(a.renewalDate) - daysBetween(b.renewalDate));
}
