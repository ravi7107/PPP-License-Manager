import {
  Gauge,
  TrendingDown,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { InsightItem, InsightTone } from '@/app/pages/executive/insights';

const ICONS: Record<InsightItem['kind'], LucideIcon> = {
  utilization: Gauge,
  cost: TrendingDown,
  renewals: CalendarClock,
  capacity: AlertTriangle,
  'all-clear': CheckCircle2,
};

const TONE_ICON_CLASS: Record<InsightTone, string> = {
  default: 'bg-primary/10 text-primary',
  warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
  success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
};

// "Read this first" strip - see executive/insights.ts for how each entry
// is derived from the same real numbers the KPI cards and tables below
// already show. Renders nothing if there's nothing to say (e.g. data
// hasn't loaded yet).
export function ExecutiveInsightStrip({ insights }: { insights: InsightItem[] }) {
  if (insights.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {insights.map((insight) => {
        const Icon = ICONS[insight.kind];

        return (
          <div
            key={insight.id}
            data-tone={insight.tone}
            className="exec-insight-card flex items-start gap-3 p-4"
          >
            <div
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                TONE_ICON_CLASS[insight.tone]
              )}
            >
              <Icon className="h-[18px] w-[18px]" />
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug text-foreground">
                {insight.headline}
              </p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                {insight.detail}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
