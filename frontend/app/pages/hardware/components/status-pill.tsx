import { cn } from '@/lib/utils';

/*
 * Soft pastel status pill (Stripe-style functional indicator) for the
 * Hardware page's asset status column. Purely presentational — it maps the
 * same `asset.status` strings the page already renders via
 * statusVariant()/<Badge>, so swapping this in changes how status looks,
 * not what drives it.
 *
 * The four buckets mirror the grouping statusVariant() already used
 * (Maintenance + Reserved share a bucket, everything unrecognized falls
 * back to "active"), just re-themed into bg/text/dot pastel triads instead
 * of shadcn's generic Badge variants.
 */

type StatusBucket = 'active' | 'warning' | 'critical' | 'info';

const BUCKET_STYLES: Record<StatusBucket, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  warning: 'bg-amber-50 text-amber-800',
  critical: 'bg-red-50 text-red-800',
  info: 'bg-blue-50 text-blue-800',
};

const BUCKET_DOT: Record<StatusBucket, string> = {
  active: 'bg-emerald-500',
  warning: 'bg-amber-500',
  critical: 'bg-red-500',
  info: 'bg-blue-500',
};

function bucketFor(status: string): StatusBucket {
  switch (status) {
    case 'Assigned':
      return 'info';

    case 'Maintenance':
    case 'Reserved':
      return 'warning';

    case 'Retired':
      return 'critical';

    default:
      // 'Available' and any other/unknown status.
      return 'active';
  }
}

export function StatusPill({ status }: { status: string }) {
  const bucket = bucketFor(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
        BUCKET_STYLES[bucket],
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', BUCKET_DOT[bucket])} aria-hidden />
      {status}
    </span>
  );
}
