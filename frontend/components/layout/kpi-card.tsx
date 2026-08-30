import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import { cn } from '@/lib/utils';

type KpiTone = 'default' | 'warning' | 'danger' | 'success';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: KpiTone;
  suffix?: string;
  prefix?: string;
  animate?: boolean;
  href?: string;
}

/*
 * Smooth numeric animation used when a KPI first appears.
 * String values are displayed normally.
 */
function AnimatedValue({
  value,
  duration = 700,
}: {
  value: number;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    const startValue = 0;
    const difference = value - startValue;

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      /*
       * Ease-out cubic:
       * fast at the beginning and smooth at the end.
       */
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      setDisplayValue(
        Math.round(startValue + difference * easedProgress)
      );

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [value, duration]);

  return <>{displayValue.toLocaleString('en-IN')}</>;
}

export function KpiCard({
  title,
  value,
  icon: Icon,
  hint,
  tone = 'default',
  suffix,
  prefix,
  animate = true,
  href,
}: KpiCardProps) {
  const numericValue =
    typeof value === 'number' &&
    Number.isFinite(value);

  const card = (
    <Card
      className={cn(
        'group relative min-h-[118px] overflow-hidden',
        'border-border/70 bg-card',
        'transition-colors duration-200',
        'hover:border-border',
        href && 'cursor-pointer',

        tone === 'warning' &&
          'border-amber-200/80 dark:border-amber-900/60',

        tone === 'danger' &&
          'border-red-200/80 dark:border-red-900/60',

        tone === 'success' &&
          'border-emerald-200/80 dark:border-emerald-900/60'
      )}
    >
      {/* Accent line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] opacity-0',
          'transition-opacity duration-300',
          'group-hover:opacity-100',

          tone === 'default' && 'bg-primary',
          tone === 'warning' && 'bg-amber-500',
          tone === 'danger' && 'bg-red-500',
          tone === 'success' && 'bg-emerald-500'
        )}
      />

      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {title}
          </CardTitle>
        </div>

        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
            'transition-transform duration-300',
            'group-hover:scale-105',

            tone === 'default' &&
              'bg-primary/10 text-primary',

            tone === 'warning' &&
              'bg-amber-500/10 text-amber-600 dark:text-amber-400',

            tone === 'danger' &&
              'bg-red-500/10 text-red-600 dark:text-red-400',

            tone === 'success' &&
              'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="flex items-baseline gap-1">
          {prefix && (
            <span className="text-lg font-semibold text-muted-foreground">
              {prefix}
            </span>
          )}

          <div className="text-[26px] font-semibold leading-none tracking-tight text-foreground">
            {numericValue && animate ? (
              <AnimatedValue value={value as number} />
            ) : numericValue ? (
              (value as number).toLocaleString('en-IN')
            ) : (
              value
            )}
          </div>

          {suffix && (
            <span className="text-sm font-semibold text-muted-foreground">
              {suffix}
            </span>
          )}
        </div>

        {hint && (
          <div className="mt-2 flex items-center gap-1.5">
            {(tone === 'warning' ||
              tone === 'danger' ||
              tone === 'success') && (
              <span
                className={cn(
                  'h-1.5 w-1.5 shrink-0 rounded-full',

                  tone === 'warning' &&
                    'bg-amber-500',

                  tone === 'danger' &&
                    'bg-red-500',

                  tone === 'success' &&
                    'bg-emerald-500'
                )}
              />
            )}

            <p
              className={cn(
                'truncate text-xs text-muted-foreground',

                tone === 'warning' &&
                  'text-amber-700 dark:text-amber-400',

                tone === 'danger' &&
                  'text-red-700 dark:text-red-400',

                tone === 'success' &&
                  'text-emerald-700 dark:text-emerald-400'
              )}
            >
              {hint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!href) return card;

  return (
    <Link to={href} className="block rounded-[inherit] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {card}
    </Link>
  );
}
