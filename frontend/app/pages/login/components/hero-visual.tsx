import { cn } from '@/lib/utils';

type HeroVariant = 'full' | 'minimal';

interface HeroVisualProps {
  // 'full' (desktop/tablet, md and up) and 'minimal' (mobile) render
  // two different source images - not just two sizes of the same one,
  // see below.
  variant?: HeroVariant;
  className?: string;
}

// - "full" serves frontend/public/login-hero.webp, the complete banner
//   the user supplied. It already bakes in the "PPS SmartAsset"
//   wordmark, the "One Platform. Complete Visibility. Total Control."
//   headline and subtitle, and the office/seat-locator illustration
//   with feature badges (User Seat Locator, PR Initiation, IT Asset
//   Inventory, Reports & Analytics, PR Inledger, Deployment/Checkout),
//   the inward/outward flow graphic and the floor-map widget. Because
//   all of that branding and copy now lives inside the artwork itself,
//   the separate BrandHeader/headline block that used to sit next to
//   the form was dropped from the desktop layout in login-page.tsx
//   (kept only as a small repeat mark - see there) to avoid showing
//   the same message twice.
//
// - "minimal" serves frontend/public/login-hero-mobile.webp, a crop of
//   the same source image with just the "PPS SmartAsset" wordmark cut
//   off the top. Unlike the previous artwork, this one weaves the
//   feature badges through the same vertical band as the headline/
//   subtitle text, so there's no clean illustration-only region left
//   to crop to once the wordmark is removed - the headline/subtitle
//   comes along with it. login-page.tsx's mobile layout no longer
//   renders a separate HTML headline for that reason (it would just
//   repeat what's now baked into this crop); it keeps only the small
//   standalone BrandHeader mark next to the form.
export function HeroVisual({ variant = 'full', className }: HeroVisualProps) {
  const minimal = variant === 'minimal';

  return (
    <div
      className={cn(
        // rgb(245,248,253)/rgb(229,236,251) approximate the image's own
        // light blue/lavender background, sampled from its corners. The
        // "full" image is object-contain'd inside a column whose height
        // is driven by the form panel next to it, so its 3:2 aspect
        // ratio rarely matches the column's exactly - matching the
        // fallback color here means any letterboxed gap blends into the
        // artwork instead of showing a stark bar.
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-[rgb(245,248,253)] to-[rgb(229,236,251)]',
        'animate-in fade-in-0 zoom-in-95 duration-700 fill-mode-both',
        minimal ? 'rounded-2xl border border-border p-3' : 'h-full w-full',
        className
      )}
    >
      <img
        src={minimal ? '/login-hero-mobile.webp' : '/login-hero.webp'}
        alt={
          minimal
            ? 'Isometric illustration of a PPS office floor showing workstations, a meeting room, reception, server room and a live seat-locator floor map with asset and workforce stats'
            : 'PPS - One Platform, Complete Visibility. Manage people, assets, procurement and workspace, all in one intelligent platform. Isometric illustration of a PPS office floor showing workstations, a meeting room, reception, server room and a live seat-locator floor map with asset and workforce stats'
        }
        className={cn(
          'w-full max-w-full object-contain drop-shadow-sm',
          minimal ? 'h-auto' : 'h-full'
        )}
      />
    </div>
  );
}
