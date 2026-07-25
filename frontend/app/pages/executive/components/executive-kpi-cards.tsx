import { DollarSign, Gauge, TrendingDown, CalendarClock } from 'lucide-react';
import { KpiCard } from '@/components/layout/kpi-card';
import { InvestmentSummaryRow } from '@/app/pages/executive/types';

export function ExecutiveKpiCards({ summary }: { summary: InvestmentSummaryRow | undefined }) {
  const totalInvestment = Number(summary?.total_investment ?? 0);
  const utilizationPct = Number(summary?.utilization_pct ?? 0);
  const unusedCost = Number(summary?.unused_cost ?? 0);
  const renewals30 = Number(summary?.renewals_30d ?? 0);
  const renewals90 = Number(summary?.renewals_90d ?? 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KpiCard
        title="Current Software Investment"
        value={`₹${totalInvestment.toLocaleString('en-IN')}`}
        icon={DollarSign}
        hint={`Across ${summary?.active_software_count ?? 0} active titles`}
      />
      <KpiCard
        title="License Utilization"
        value={`${utilizationPct}%`}
        icon={Gauge}
        hint={`${Number(summary?.used_seats ?? 0).toLocaleString()} of ${Number(summary?.total_seats ?? 0).toLocaleString()} seats used`}
        tone={utilizationPct < 60 ? 'warning' : 'default'}
      />
      <KpiCard
        title="Unused License Cost"
        value={`₹${unusedCost.toLocaleString('en-IN')}`}
        icon={TrendingDown}
        hint="Spend tied to idle seats"
        tone={unusedCost > 0 ? 'danger' : 'default'}
      />
      <KpiCard
        title="Upcoming Renewals"
        value={renewals90}
        icon={CalendarClock}
        hint={`${renewals30} due within 30 days`}
        tone={renewals30 > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}
