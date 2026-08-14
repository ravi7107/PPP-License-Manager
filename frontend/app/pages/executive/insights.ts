import {
  InvestmentSummaryRow,
  CapacityRunwayRow,
} from '@/app/pages/executive/types';

/*
 * Turns the numbers already on this page into a handful of plain-English
 * headline statements - the "read this first" strip above the KPI grid.
 * Every insight here is a direct, honest read of a value the backend
 * already computes (see AnalyticsService.BuildInvestmentSummary /
 * BuildCapacityRunway) - nothing here is estimated, projected, or
 * invented. The thresholds used to decide severity (utilization < 60%,
 * unused cost > 0, renewals due within 30/90 days, capacity runway's own
 * "Out of free seats"/"Under 4 weeks" recommendation) are the exact same
 * thresholds already used elsewhere on this page (ExecutiveKpiCards,
 * CapacityRunwayCard's recommendationTone) - kept in one place here
 * instead of re-derived so the KPI cards, table badges, and this strip
 * can never disagree with each other about what counts as "at risk".
 */

export type InsightTone = 'default' | 'warning' | 'danger' | 'success';

export interface InsightItem {
  id: string;
  tone: InsightTone;
  kind: 'utilization' | 'cost' | 'renewals' | 'capacity' | 'all-clear';
  headline: string;
  detail: string;
}

const CAPACITY_AT_RISK_PREFIXES = ['Out of free seats', 'Under 4 weeks'];

export function countAtRiskCapacityTitles(
  rows: CapacityRunwayRow[]
): number {
  return rows.filter((r) =>
    CAPACITY_AT_RISK_PREFIXES.some((prefix) =>
      r.recommendation.startsWith(prefix)
    )
  ).length;
}

export function buildExecutiveInsights(
  summary: InvestmentSummaryRow | undefined,
  capacityRunway: CapacityRunwayRow[]
): InsightItem[] {
  if (!summary) return [];

  const utilizationPct = Number(summary.utilization_pct ?? 0);
  const unusedCost = Number(summary.unused_cost ?? 0);
  const renewals30 = Number(summary.renewals_30d ?? 0);
  const renewals90 = Number(summary.renewals_90d ?? 0);
  const atRiskCount = countAtRiskCapacityTitles(capacityRunway);

  const insights: InsightItem[] = [];

  // Same < 60% threshold ExecutiveKpiCards uses to flag the Utilization
  // card - kept identical so this strip and that card always agree.
  if (utilizationPct < 60) {
    insights.push({
      id: 'utilization',
      tone: 'warning',
      kind: 'utilization',
      headline: `License utilization is only ${utilizationPct}%`,
      detail: `${Number(summary.used_seats ?? 0).toLocaleString('en-IN')} of ${Number(
        summary.total_seats ?? 0
      ).toLocaleString('en-IN')} paid seats are actually in use.`,
    });
  } else {
    insights.push({
      id: 'utilization',
      tone: 'success',
      kind: 'utilization',
      headline: `License utilization is healthy at ${utilizationPct}%`,
      detail: `${Number(summary.used_seats ?? 0).toLocaleString('en-IN')} of ${Number(
        summary.total_seats ?? 0
      ).toLocaleString('en-IN')} paid seats are in active use.`,
    });
  }

  // Same > 0 threshold ExecutiveKpiCards uses for the Unused Cost card.
  if (unusedCost > 0) {
    insights.push({
      id: 'unused-cost',
      tone: 'danger',
      kind: 'cost',
      headline: `₹${unusedCost.toLocaleString('en-IN')} tied up in unused seats`,
      detail: 'Spend on license seats that are currently idle, pro-rated across active purchases.',
    });
  }

  // Same > 0 threshold ExecutiveKpiCards uses for the Renewals card.
  if (renewals30 > 0) {
    insights.push({
      id: 'renewals',
      tone: 'warning',
      kind: 'renewals',
      headline: `${renewals30} renewal${renewals30 === 1 ? '' : 's'} due within 30 days`,
      detail: `${renewals90} due within 90 days in total - see Upcoming Renewals below.`,
    });
  } else if (renewals90 > 0) {
    insights.push({
      id: 'renewals',
      tone: 'default',
      kind: 'renewals',
      headline: `${renewals90} renewal${renewals90 === 1 ? '' : 's'} coming up within 90 days`,
      detail: 'None due in the next 30 days - see Upcoming Renewals below for dates.',
    });
  }

  // Same recommendation prefixes CapacityRunwayCard uses for its
  // "destructive" badge tone.
  if (atRiskCount > 0) {
    insights.push({
      id: 'capacity',
      tone: 'danger',
      kind: 'capacity',
      headline: `${atRiskCount} software title${atRiskCount === 1 ? '' : 's'} at risk of running out of seats`,
      detail: 'Out of free seats, or under 4 weeks of runway at the current pace - see Capacity Runway below.',
    });
  }

  // If nothing above fired, say so explicitly rather than leaving an
  // empty strip - a quiet page is itself a real, worth-stating signal.
  if (
    unusedCost <= 0 &&
    renewals30 <= 0 &&
    renewals90 <= 0 &&
    atRiskCount <= 0 &&
    utilizationPct >= 60
  ) {
    insights.push({
      id: 'all-clear',
      tone: 'success',
      kind: 'all-clear',
      headline: 'Nothing urgent right now',
      detail: 'No unused spend, no renewals due within 90 days, and no software title is close to running out of seats.',
    });
  }

  return insights;
}
