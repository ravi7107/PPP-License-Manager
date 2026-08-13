import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BrandHeaderProps {
  // Mobile shows a smaller, tighter header than the desktop split-screen
  // panel - same mark and wordmark, less vertical space.
  compact?: boolean;
  className?: string;
}

// The app has no logo image anywhere in the project - its only existing
// "mark" is the Building2 icon in a primary-colored rounded square, used
// today in the sidebar header (components/layout/app-sidebar.tsx). This
// reuses that exact mark at a larger size instead of inventing a new one,
// so the login page and the authenticated app agree on what "the PPS
// brand" looks like.
export function BrandHeader({ compact, className }: BrandHeaderProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm',
          compact ? 'h-10 w-10' : 'h-12 w-12'
        )}
      >
        <Building2 className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
      </div>

      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            'font-semibold tracking-tight text-foreground',
            compact ? 'text-lg' : 'text-xl'
          )}
        >
          PPS GROUP
        </span>

        <span
          className={cn(
            'text-muted-foreground',
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          Digital Workplace &amp; IT Management
        </span>
      </div>
    </div>
  );
}
