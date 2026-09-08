using PPS.LicenseManager.API.DTOs.Notification;

namespace PPS.LicenseManager.API.Services.Interfaces;

public interface INotificationService
{
    Task<int> NotifyItAndReportingManagerAsync(
        int affectedUserId,
        string type,
        string title,
        string message,
        string? relatedEntityType = null,
        int? relatedEntityId = null);

    // Notification bell - returns the current user's most recent
    // notifications (newest first). Also generates any newly-due
    // License-expiring-soon notifications first, since this app has no
    // background job infrastructure to do that on a schedule.
    Task<List<NotificationResponse>> GetMyNotificationsAsync(
        int userId,
        int limit = 50);

    Task<int> GetUnreadCountAsync(int userId);

    // Returns false if no notification with this id belongs to this
    // user (already read is still a success - idempotent).
    Task<bool> MarkAsReadAsync(int notificationId, int userId);

    // Returns how many notifications were marked read.
    Task<int> MarkAllAsReadAsync(int userId);
}
