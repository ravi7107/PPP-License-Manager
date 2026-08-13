import { cn } from '@/lib/utils';

interface BrandHeaderProps {
  // Mobile shows a smaller, tighter header than the desktop split-screen
  // panel - same mark and wordmark, less vertical space.
  compact?: boolean;
  className?: string;
}

// The app has no logo image asset anywhere in the project - its only
// existing "mark" is a Building2 icon in a primary-colored square, used
// today in the sidebar (components/layout/app-sidebar.tsx). This login
// page instead draws a small hexagon mark directly in SVG using the same
// --primary theme color, since a hexagon reads as a more distinctive
// "brand mark" than a generic building icon in a square. It's plain
// inline SVG - no new asset, no new dependency.
function HexMark({ compact }: { compact?: boolean }) {
  const size = compact ? 40 : 48;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M24 2 44 13.5v21L24 46 4 34.5v-21z"
        fill="var(--primary)"
        fillOpacity="0.08"
        stroke="var(--primary)"
        strokeWidth="2.5"
      />
      <circle cx="24" cy="24" r="9" fill="var(--primary)" />
      <circle cx="24" cy="24" r="9" fill="none" stroke="white" strokeWidth="2" />
    </svg>
  );
}

export function BrandHeader({ compact, className }: BrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <HexMark compact={compact} />

      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          compact ? 'text-lg' : 'text-2xl'
        )}
      >
        PPS GROUP
      </span>
    </div>
  );
}
