import api from './client';

export interface NotificationRecord {
  id: number;

  // Examples: "LicenseExpiringSoon", "ReallocationRequested",
  // "ReturnDueSoon", "ReturnOverdue", "LicenseReturned".
  type: string;

  title: string;
  message: string;

  // Lets the UI deep-link to the related record, e.g.
  // relatedEntityType = "License", relatedEntityId = 42.
  relatedEntityType: string | null;
  relatedEntityId: number | null;

  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}


// ============================================================
// MY NOTIFICATIONS (notification bell)
// ============================================================

export async function getMyNotifications(
  limit: number = 50
): Promise<NotificationRecord[]> {
  const response = await api.get<NotificationRecord[]>('/Notification/my', {
    params: { limit },
  });

  return response.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const response = await api.get<{ unreadCount: number }>(
    '/Notification/unread-count'
  );

  return response.data.unreadCount;
}


// ============================================================
// MARK READ
// ============================================================

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/Notification/${id}/read`);
}

export async function markAllNotificationsRead(): Promise<number> {
  const response = await api.post<{ markedCount: number }>(
    '/Notification/mark-all-read'
  );

  return response.data.markedCount;
}
