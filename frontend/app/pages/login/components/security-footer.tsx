import { ShieldCheck, Zap, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SecurityFooter({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
          Secure
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary/70" />
          Reliable
        </span>

        <span className="inline-flex items-center gap-1.5">
          <Link2 className="h-3.5 w-3.5 text-primary/70" />
          Connected
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} PPS Group &middot; IT
        Infrastructure &amp; Security
      </p>
    </div>
  );
}
