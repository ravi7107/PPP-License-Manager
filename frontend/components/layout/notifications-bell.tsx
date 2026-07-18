import { Bell, CheckCheck } from 'lucide-react';
import { useUser, useLoadAction, useMutateAction } from '@/lib/uibakery';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import loadMyNotifications from '@/actions/requests/loadMyNotifications';
import loadUnreadNotificationCount from '@/actions/requests/loadUnreadNotificationCount';
import markNotificationRead from '@/actions/requests/markNotificationRead';
import markAllNotificationsRead from '@/actions/requests/markAllNotificationsRead';
import { NotificationRecord } from '@/app/pages/requests/types';

export function NotificationsBell() {
  const user = useUser();
  const actorName = user?.name ?? '';
  const params = { actorName };
// Temporary until backend API is implemented
const notifications: NotificationRecord[] = [];
const unread: { unread_count: number }[] = [];

const refetchNotifications = async () => {};
const refetchUnread = async () => {};

const markRead = async (_: any) => {};
const markAllRead = async (_: any) => {};
  const unreadCount = unread?.[0]?.unread_count ?? 0;

  const handleOpenChange = async (open: boolean) => {
    if (open) {
      await refetchNotifications();
      await refetchUnread();
    }
  };

  const handleMarkRead = async (id: number) => {
    await markRead({ notificationId: id });
    await refetchNotifications();
    await refetchUnread();
  };

  const handleMarkAllRead = async () => {
    await markAllRead({ actorName });
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
                  onClick={() => !n.is_read && handleMarkRead(n.id)}
                  className={`flex flex-col items-start gap-0.5 p-3 text-left text-sm hover:bg-accent ${n.is_read ? 'opacity-60' : ''}`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-medium">{n.title}</span>
                    {!n.is_read ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                  </div>
                  {n.message ? <p className="text-xs text-muted-foreground">{n.message}</p> : null}
                  <span className="text-[11px] text-muted-foreground">{n.created_at?.slice(0, 19).replace('T', ' ')}</span>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
