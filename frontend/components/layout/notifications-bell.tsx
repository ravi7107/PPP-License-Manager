import { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  NotificationRecord,
  getMyNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/lib/api/notifications.api';

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refetchUnread = async () => {
    try {
      setUnreadCount(await getUnreadNotificationCount());
    } catch {
      // Non-critical - badge just stays at its last known value.
    }
  };

  const refetchNotifications = async () => {
    try {
      setNotifications(await getMyNotifications());
    } catch {
      // Non-critical - list just stays at its last known value.
    }
  };

  // Fetch the unread count once on mount so the badge is correct as
  // soon as the app loads, not only after the bell is first opened.
  // This is also what generates any newly-due "License expiring soon"
  // notifications (see NotificationService - there's no background job
  // in this app, so that check runs inline on this same request).
  useEffect(() => {
    refetchUnread();
  }, []);

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      await refetchNotifications();
      await refetchUnread();
    }
  };

  const handleMarkRead = async (id: number) => {
    await markNotificationRead(id);
    await refetchNotifications();
    await refetchUnread();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    await refetchNotifications();
    await refetchUnread();
  };

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-4 w-4 text-muted-foreground" />
          {unreadCount > 0 ? (
            <Badge className="absolute -right-1 -top-1 h-4 min-w-4 justify-center rounded-full px-1 text-[10px]" variant="destructive">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b p-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unreadCount > 0 ? (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={handleMarkAllRead}>
              <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          ) : null}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <div className="flex flex-col divide-y">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`flex flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-accent ${n.isRead ? 'opacity-60' : ''}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{n.title}</span>
                    {!n.isRead ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </div>
                  {n.message ? <p className="text-xs text-muted-foreground">{n.message}</p> : null}
                  <span className="text-[11px] text-muted-foreground">{n.createdAt?.slice(0, 19).replace('T', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
