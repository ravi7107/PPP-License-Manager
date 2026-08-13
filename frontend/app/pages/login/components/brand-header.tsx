import { cn } from '@/lib/utils';

interface BrandHeaderProps {
  // Mobile shows a smaller mark than the desktop split-screen panel.
  compact?: boolean;
  className?: string;
}

// Served from frontend/public/pps-logo.jpg (Vite copies public/ verbatim
// to the built site root, so "/pps-logo.jpg" resolves correctly both in
// dev and behind nginx in production) - the actual PPS logo. The
// wordmark "PPS" text that used to sit next to it was dropped since the
// logo already spells out "PPS" itself - having both was redundant.
export function BrandHeader({ compact, className }: BrandHeaderProps) {
  return (
    <div className={cn('flex items-center', className)}>
      <img
        src="/pps-logo.jpg"
        alt="PPS"
        className={cn(
          'shrink-0 rounded-lg object-contain',
          compact ? 'h-12 w-12' : 'h-14 w-14'
        )}
      />
    </div>
  );
}
