// Shared display helpers for notification.type / notification.relatedEntityType,
// used by both the notification bell (components/layout/notifications-bell.tsx)
// and the full notifications list (app/pages/notifications/notifications-page.tsx).

export type NotificationSeverity = 'critical' | 'warning' | 'success' | 'info';

// Every notification.type value currently written by the backend falls into
// one of these buckets by a simple suffix check - see the Type examples
// listed in Models/Notification.cs and each service's AddNotification /
// NotifyRequesterAsync helper (MaterialMovementService, PurchaseRequisitionService,
// AssetReallocationRequestService, AvailabilityService, NotificationService).
export function getNotificationSeverity(type: string): NotificationSeverity {
  if (type.endsWith('Rejected') || type.endsWith('Overdue')) {
    return 'critical';
  }

  if (
    type.endsWith('ApprovalNeeded') ||
    type === 'LicenseExpiringSoon' ||
    type.endsWith('DueSoon')
  ) {
    return 'warning';
  }

  if (type.endsWith('Approved') || type.endsWith('Returned')) {
    return 'success';
  }

  return 'info';
}

// A small colored dot, used in place of the plain "unread" indicator so the
// notification's urgency is visible at a glance.
export function severityDotClass(severity: NotificationSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500';
    case 'warning':
      return 'bg-amber-500';
    case 'success':
      return 'bg-emerald-500';
    default:
      return 'bg-blue-500';
  }
}

// Maps a notification's relatedEntityType to the page where that record
// lives, so clicking a notification can take the user straight there.
// Kept as a flat map (rather than routing per notification.type) because
// every notification-writing service in the backend uses one consistent
// relatedEntityType string across all of its notifications:
//   License -> LicenseExpiringSoon (NotificationService)
//   ResourceReallocationRequest -> ReallocationRequested/Approved/Rejected (AvailabilityService)
//   AssetReallocationRequest -> AssetReallocationRequested/Approved/Rejected (AssetReallocationRequestService)
//   MaterialMovement -> MaterialMovementApprovalNeeded/Approved/Rejected (MaterialMovementService)
//   PurchaseRequisition -> PurchaseRequisitionApprovalNeeded/Approved/Rejected (PurchaseRequisitionService)
const RELATED_ENTITY_ROUTES: Record<string, string> = {
  License: '/licenses',
  ResourceReallocationRequest: '/availability',
  AssetReallocationRequest: '/hardware',
  MaterialMovement: '/material-movements',
  PurchaseRequisition: '/purchase-requisitions',
};

export function getNotificationRoute(
  relatedEntityType: string | null
): string | null {
  if (!relatedEntityType) return null;
  return RELATED_ENTITY_ROUTES[relatedEntityType] ?? null;
}

// Relative time, e.g. "just now", "5m ago", "3h ago", "2d ago". Falls back
// to a plain date once it's more than a week old, since "34d ago" stops
// being a useful measurement at that point.
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();

  if (Number.isNaN(then)) return iso;

  const now = Date.now();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;

  return new Date(iso).toLocaleDateString();
}
