import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, ChevronRight } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  NotificationRecord,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications.api';
import {
  formatRelativeTime,
  getNotificationRoute,
  getNotificationSeverity,
  severityDotClass,
} from '@/lib/utils/notification-display';

// The full notification history - reached from the bell's "View all
// notifications" link. The bell itself only shows the most recent ones
// in a small popover; this page has room to show everything.
export default function NotificationsPage() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = async () => {
    try {
      setNotifications(await getMyNotifications(200));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    await refetch();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await refetch();
  };

  const handleClick = async (n: NotificationRecord) => {
    if (!n.isRead) {
      await handleMarkRead(n.id);
    }

    const route = getNotificationRoute(n.relatedEntityType);
    if (route) {
      navigate(route);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Everything sent to your notification bell.
          </p>
        </div>
        {unreadCount > 0 ? (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
            Mark all read
          </Button>
        ) : null}
      </div>

      {loading ? (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          Loading...
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border px-4 py-10 text-center text-sm text-muted-foreground">
          No notifications yet.
        </div>
      ) : (
        <div className="divide-y rounded-lg border">
          {notifications.map((n) => {
            const severity = getNotificationSeverity(n.type);
            const hasRoute = !!getNotificationRoute(n.relatedEntityType);

            return (
              <button
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm hover:bg-accent ${n.isRead ? 'opacity-60' : ''}`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityDotClass(severity)} ${n.isRead ? 'opacity-50' : ''}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{n.title}</span>
                    {!n.isRead ? (
                      <Badge variant="secondary" className="h-5 text-[10px]">
                        Unread
                      </Badge>
                    ) : null}
                  </div>
                  {n.message ? (
                    <p className="mt-0.5 text-[13px] text-muted-foreground">{n.message}</p>
                  ) : null}
                  <p className="mt-1 text-[12px] text-muted-foreground">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                {hasRoute ? (
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" />
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
