import {
  BarChart3,
  Boxes,
  Briefcase,
  ClipboardList,
  DoorOpen,
  MapPin,
  Monitor,
  Server,
  ShieldCheck,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Zone {
  icon: LucideIcon;
  label: string;
  // Small vertical offset per tile gives the grid a gentle "layered
  // depth" feel (see design brief) without a literal isometric
  // projection, which tends to fight with legible labels/icons.
  lift?: boolean;
  // A tiny decorative mini-scene inside the card - desks/seats/racks
  // sketched with plain divs (no extra icons/assets), just enough detail
  // to read as "this is that kind of room" at a glance.
  scene: React.ReactNode;
}

function DeskRow({ occupied = [] }: { occupied?: number[] }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 4 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-2 rounded-sm',
            occupied.includes(i) ? 'bg-primary' : 'bg-primary/15'
          )}
        />
      ))}
    </div>
  );
}

const ZONES: Zone[] = [
  {
    icon: DoorOpen,
    label: 'Reception',
    scene: (
      <div className="flex items-center gap-1">
        <span className="h-2.5 w-4 rounded-sm bg-primary/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
      </div>
    ),
  },
  {
    icon: Monitor,
    label: 'Workstations',
    lift: true,
    scene: (
      <div className="flex flex-col gap-1">
        <DeskRow occupied={[0, 2]} />
        <DeskRow occupied={[1]} />
      </div>
    ),
  },
  {
    icon: Users,
    label: 'Meeting Room',
    scene: (
      <div className="flex items-center justify-center">
        <span className="relative flex h-3 w-5 items-center justify-center rounded-full bg-primary/20">
          <span className="absolute -left-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
          <span className="absolute -right-1 h-1.5 w-1.5 rounded-full bg-primary/60" />
        </span>
      </div>
    ),
  },
  {
    icon: Server,
    label: 'Server Room',
    lift: true,
    scene: (
      <div className="flex gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="h-3 w-1.5 rounded-sm bg-primary/25" />
        ))}
      </div>
    ),
  },
  {
    icon: Briefcase,
    label: 'Manager Cabin',
    scene: (
      <span className="h-2 w-4 rounded-sm bg-primary/20" />
    ),
  },
  {
    icon: Boxes,
    label: 'Digital Assets',
    lift: true,
    scene: (
      <div className="flex gap-1">
        <span className="h-2 w-2 rounded-sm bg-primary/25" />
        <span className="h-2 w-2 rounded-sm bg-primary/15" />
        <span className="h-2 w-2 rounded-sm bg-primary/25" />
      </div>
    ),
  },
];

interface Badge {
  icon: LucideIcon;
  title: string;
  description: string;
  iconClassName: string;
}

const BADGES: Badge[] = [
  {
    icon: Monitor,
    title: 'Asset Inventory',
    description: 'Track and manage IT assets in real time.',
    iconClassName: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ClipboardList,
    title: 'PR Initiation',
    description: 'Create, approve and track purchase requests.',
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: MapPin,
    title: 'User Seat Locator',
    description: 'Find users, systems and seats instantly.',
    iconClassName: 'bg-purple-50 text-purple-600',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Smart insights for better decision making.',
    iconClassName: 'bg-orange-50 text-orange-600',
  },
];

// 21-seat mini floor grid. A few seats are marked occupied/maintenance so
// the legend underneath means something, not just decoration; index 10
// (roughly the middle) is "you are here" - the one seat rendered as a
// pulsing located marker instead of a plain dot.
const SEAT_COUNT = 21;
const LOCATED_SEAT_INDEX = 10;
const OCCUPIED_SEAT_INDICES = [2, 5, 14, 17];
const MAINTENANCE_SEAT_INDEX = 8;

function FloorMapWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-64 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm',
        'animate-in fade-in-0 slide-in-from-bottom-4 fill-mode-both duration-700',
        className
      )}
      style={{ animationDelay: '550ms' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
          FLOOR 2
        </span>
        <MapPin className="h-3 w-3 text-primary" />
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: SEAT_COUNT }).map((_, i) => {
          if (i === LOCATED_SEAT_INDEX) {
            return (
              <span key={i} className="relative flex h-2 w-2 items-center justify-center">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
            );
          }

          if (i === MAINTENANCE_SEAT_INDEX) {
            return (
              <span key={i} className="h-2 w-2 rounded-full bg-red-400" />
            );
          }

          if (OCCUPIED_SEAT_INDICES.includes(i)) {
            return (
              <span key={i} className="h-2 w-2 rounded-full bg-primary/70" />
            );
          }

          return (
            <span key={i} className="h-2 w-2 rounded-full bg-muted-foreground/25" />
          );
        })}
      </div>

      <div className="mt-3 space-y-0.5 border-t border-border pt-2">
        <p className="text-xs font-semibold text-foreground">
          WORKSTATION A-23
        </p>
        <p className="text-[11px] text-muted-foreground">
          User: Amol Ugale
        </p>
        <p className="text-[11px] text-muted-foreground">
          System: PPS-IT-024
        </p>

        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-2 text-[10px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/25" />
          Available
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
          Occupied
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
          Maintenance
        </span>
      </div>
    </div>
  );
}

type HeroVariant = 'full' | 'reduced' | 'minimal';

interface HeroVisualProps {
  // full: office zone grid + connector lines + "One Platform" badge +
  //   the four feature reinforcement badges + floor map (desktop).
  // reduced: office zone grid + floor map only, no connector lines/
  //   badges (tablet - "reduce the hero visual while preserving the
  //   login experience").
  // minimal: floor map widget only, no zone grid (mobile - "small
  //   simplified illustration").
  variant?: HeroVariant;
  className?: string;
}

export function HeroVisual({ variant = 'full', className }: HeroVisualProps) {
  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center gap-3 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.12] p-5',
          'animate-in fade-in-0 zoom-in-95 duration-700 fill-mode-both',
          className
        )}
      >
        <p className="text-center text-xs text-muted-foreground">
          Live seat &amp; asset visibility across your offices.
        </p>

        <FloorMapWidget className="w-full max-w-xs" />
      </div>
    );
  }

  const reduced = variant === 'reduced';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.12]',
        'animate-in fade-in-0 zoom-in-95 duration-700 fill-mode-both',
        className
      )}
    >
      {/* Faint floor-plan grid backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />

      {!reduced && (
        <>
          {/* Subtle digital connections from IT/Server out to the
              workstation and assets zones - purely decorative, kept to
              a couple of thin low-opacity lines. */}
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full opacity-40"
            preserveAspectRatio="none"
          >
            <line
              x1="50%"
              y1="46%"
              x2="18%"
              y2="24%"
              stroke="var(--primary)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
            <line
              x1="50%"
              y1="46%"
              x2="82%"
              y2="70%"
              stroke="var(--primary)"
              strokeWidth="1"
              strokeDasharray="4 5"
            />
          </svg>

          <div
            className="absolute right-6 top-6 flex animate-in fade-in-0 slide-in-from-top-2 fill-mode-both items-center gap-2 rounded-full border border-border bg-card/95 py-1.5 pl-2 pr-3 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"
            style={{ animationDelay: '650ms' }}
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <ShieldCheck className="h-3.5 w-3.5" />
            </span>
            <span className="leading-tight">
              One Platform
              <br />
              Complete Visibility
            </span>
          </div>
        </>
      )}

      <div className="relative grid h-full grid-cols-3 gap-3 p-8 pb-4">
        {ZONES.map((zone, index) => (
          <div
            key={zone.label}
            style={{ animationDelay: `${200 + index * 90}ms` }}
            className={cn(
              'animate-in fade-in-0 zoom-in-95 fill-mode-both duration-500',
              'flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-card/90 px-2 py-4 text-center shadow-sm backdrop-blur-sm',
              zone.lift && 'lg:-translate-y-2'
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <zone.icon className="h-4 w-4" />
            </div>

            <span className="text-[11px] font-medium leading-tight text-foreground">
              {zone.label}
            </span>

            {!reduced && zone.scene}
          </div>
        ))}
      </div>

      {!reduced && (
        <div className="relative grid grid-cols-2 gap-2 px-6 pb-4">
          {BADGES.map((badge, index) => (
            <div
              key={badge.title}
              style={{ animationDelay: `${750 + index * 90}ms` }}
              className="flex animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both items-start gap-2 rounded-lg border border-border bg-card/95 p-2.5 shadow-sm backdrop-blur-sm"
            >
              <span
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                  badge.iconClassName
                )}
              >
                <badge.icon className="h-3.5 w-3.5" />
              </span>

              <span className="leading-tight">
                <span className="block text-[11px] font-semibold text-foreground">
                  {badge.title}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  {badge.description}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="relative flex justify-center px-6 pb-6">
        <FloorMapWidget />
      </div>
    </div>
  );
}
