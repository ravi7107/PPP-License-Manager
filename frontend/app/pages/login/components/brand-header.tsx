import { cn } from '@/lib/utils';

interface BrandHeaderProps {
  // Mobile shows a smaller mark than the desktop split-screen panel.
  compact?: boolean;
  className?: string;
}

// Served from frontend/public/pps-logo.jpg (Vite copies public/ verbatim
// to the built site root, so "/pps-logo.jpg" resolves correctly both in
// dev and behind nginx in production) - the actual PPS logo, not a
// hand-drawn substitute.
export function BrandHeader({ compact, className }: BrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <img
        src="/pps-logo.jpg"
        alt="PPS logo"
        className={cn(
          'shrink-0 rounded-lg object-contain',
          compact ? 'h-10 w-10' : 'h-12 w-12'
        )}
      />

      <span
        className={cn(
          'font-bold tracking-tight text-foreground',
          compact ? 'text-xl' : 'text-2xl'
        )}
      >
        PPS
      </span>
    </div>
  );
}
