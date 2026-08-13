import { ClipboardList, MapPin, Monitor, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stat {
  icon: LucideIcon;
  value: string;
  label: string;
  iconClassName: string;
}

// Illustrative numbers, not live data - matches the rest of the hero
// artwork rather than querying the database. This is the unauthenticated
// login page, so wiring these to real counts would mean adding a new
// endpoint that's reachable without signing in; that's a deliberate call
// to leave for later rather than something this redesign should decide
// on its own.
const STATS: Stat[] = [
  {
    icon: Monitor,
    value: '512',
    label: 'Total Assets',
    iconClassName: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Users,
    value: '486',
    label: 'Active Users',
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: ClipboardList,
    value: '28',
    label: 'PR in Process',
    iconClassName: 'bg-orange-50 text-orange-600',
  },
  {
    icon: MapPin,
    value: '96%',
    label: 'Seat Occupied',
    iconClassName: 'bg-purple-50 text-purple-600',
  },
  {
    icon: ShieldCheck,
    value: '100%',
    label: 'Protected',
    iconClassName: 'bg-primary/10 text-primary',
  },
];

export function StatsStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 gap-3 border-t border-border bg-card/60 px-6 py-4 sm:grid-cols-3 lg:grid-cols-5 lg:px-10',
        className
      )}
    >
      {STATS.map((stat, index) => (
        <div
          key={stat.label}
          style={{ animationDelay: `${900 + index * 80}ms` }}
          className="flex animate-in fade-in-0 fill-mode-both items-center gap-2.5 duration-500"
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
              stat.iconClassName
            )}
          >
            <stat.icon className="h-4 w-4" />
          </span>

          <span className="leading-tight">
            <span className="block text-base font-semibold text-foreground">
              {stat.value}
            </span>
            <span className="block text-xs text-muted-foreground">
              {stat.label}
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}
