import {
  Boxes,
  Briefcase,
  DoorOpen,
  MapPin,
  Monitor,
  Server,
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
}

const ZONES: Zone[] = [
  { icon: DoorOpen, label: 'Reception' },
  { icon: Monitor, label: 'Workstations', lift: true },
  { icon: Users, label: 'Meeting Room' },
  { icon: Server, label: 'IT / Server Room', lift: true },
  { icon: Briefcase, label: 'Manager Cabin' },
  { icon: Boxes, label: 'Digital Assets', lift: true },
];

// 21-seat mini floor grid; index 10 (roughly the middle) is "you are
// here" - the one seat rendered as a pulsing located marker instead of a
// plain dot.
const SEAT_COUNT = 21;
const LOCATED_SEAT_INDEX = 10;

function FloorMapWidget({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'w-56 rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-sm',
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
        {Array.from({ length: SEAT_COUNT }).map((_, i) =>
          i === LOCATED_SEAT_INDEX ? (
            <span key={i} className="relative flex h-2 w-2 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          ) : (
            <span
              key={i}
              className="h-2 w-2 rounded-full bg-muted-foreground/25"
            />
          )
        )}
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
    </div>
  );
}

type HeroVariant = 'full' | 'reduced' | 'minimal';

interface HeroVisualProps {
  // full: office zone grid + connector lines + stat chip + floor map
  //   (desktop).
  // reduced: office zone grid + floor map, no connector lines/stat chip
  //   (tablet - "reduce the hero visual while preserving the login
  //   experience").
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
            className="absolute right-6 top-6 animate-in fade-in-0 slide-in-from-top-2 fill-mode-both rounded-full border border-border bg-card/95 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur-sm"
            style={{ animationDelay: '650ms' }}
          >
            1,200+ Assets Tracked
          </div>
        </>
      )}

      <div className="relative grid h-full grid-cols-3 gap-3 p-8 pb-6">
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
          </div>
        ))}
      </div>

      <div className="relative px-6 pb-6">
        <FloorMapWidget />
      </div>
    </div>
  );
}
