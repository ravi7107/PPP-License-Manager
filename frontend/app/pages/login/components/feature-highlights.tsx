import { Boxes, ClipboardList, MapPin, BarChart3 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Feature {
  icon: LucideIcon;
  title: string;
  description: string;
}

// Mirrors the four modules this redesign is meant to introduce the app
// through - deliberately not an exhaustive module list (the sidebar has
// far more), just the ones that give a first-time or returning user a
// fast read on "what is this app for."
const FEATURES: Feature[] = [
  {
    icon: Boxes,
    title: 'Asset Inventory',
    description: 'Track and manage IT assets.',
  },
  {
    icon: ClipboardList,
    title: 'PR Initiation',
    description: 'Create and track purchase requisitions.',
  },
  {
    icon: MapPinned,
    title: 'User Seat Locator',
    description: 'Find users, systems and seats instantly.',
  },
  {
    icon: BarChart3,
    title: 'Reports & Analytics',
    description: 'Get meaningful IT and workplace insights.',
  },
];

export function FeatureHighlights({ className }: { className?: string }) {
  return (
    <div className={cn('grid grid-cols-2 gap-3', className)}>
      {FEATURES.map((feature, index) => (
        <div
          key={feature.title}
          style={{ animationDelay: `${150 + index * 90}ms` }}
          className={cn(
            'animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both',
            'group rounded-lg border border-border bg-card p-3 shadow-sm',
            'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:border-primary/30'
          )}
        >
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
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
