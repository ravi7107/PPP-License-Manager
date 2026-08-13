import { cn } from '@/lib/utils';

type HeroVariant = 'full' | 'reduced' | 'minimal';

interface HeroVisualProps {
  // Same underlying image at every variant - full/reduced/minimal only
  // change how much room it's given (desktop / tablet / the small
  // mobile illustration appended below the form), so it scales down
  // gracefully instead of swapping content.
  variant?: HeroVariant;
  className?: string;
}

// Served from frontend/public/login-hero.png - the office + seat-locator
// illustration the user supplied directly, rather than a hand-built CSS/
// SVG recreation. It's purely decorative artwork (no login controls or
// functional text baked into it - that all still lives in the real
// LoginForm component on the left), so using the image here doesn't
// touch the "keep the form real" constraint from the original redesign.
export function HeroVisual({ variant = 'full', className }: HeroVisualProps) {
  const minimal = variant === 'minimal';

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/[0.06] via-background to-primary/[0.12]',
        'animate-in fade-in-0 zoom-in-95 duration-700 fill-mode-both',
        minimal ? 'rounded-2xl p-4' : 'p-4 lg:p-6',
        className
      )}
    >
      <img
        src="/login-hero.png"
        alt="Isometric illustration of a PPS office floor showing workstations, a meeting room, reception, server room and a live seat-locator floor map with asset and workforce stats"
        className="h-auto w-full max-w-full object-contain drop-shadow-sm"
      />
    </div>
  );
}
