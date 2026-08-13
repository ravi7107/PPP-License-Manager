import { Boxes, ClipboardList, MapPin, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
  // Per-feature accent color, purely for visual differentiation/
  // scannability across the four tiles - the app's single --primary
  // token is still used everywhere else (buttons, links, the brand
  // mark), this is a one-off decorative choice local to this row.
  iconClassName: string;
}

const FEATURES: Feature[] = [
  {
    icon: Boxes,
    title: 'Asset Inventory',
    description: 'Track and manage IT assets.',
    iconClassName: 'bg-blue-50 text-blue-600',
  },
  {
    icon: ClipboardList,
    title: 'PR Initiation',
    description: 'Create and track purchase requisitions.',
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
    description: 'Get meaningful IT and workplace insights.',
    iconClassName: 'bg-orange-50 text-orange-600',
  },
];

export function FeatureHighlights({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>
      {FEATURES.map((feature, index) => (
        <div
          key={feature.title}
          style={{ animationDelay: `${150 + index * 90}ms` }}
          className={cn(
            'animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both',
            'rounded-lg border border-border bg-card p-3 shadow-sm',
            'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30'
          )}
        >
          <div
            className={cn(
              'mb-2 flex h-8 w-8 items-center justify-center rounded-md',
              feature.iconClassName
            )}
          >
            <feature.icon className="h-4 w-4" />
          </div>

          <p className="text-sm font-medium text-foreground">
            {feature.title}
          </p>

          <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
            {feature.description}
          </p>
        </div>
      ))}
    </div>
  );
}
