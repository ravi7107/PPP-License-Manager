using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;

    public NotificationService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> NotifyItAndReportingManagerAsync(
        int affectedUserId,
        string type,
        string title,
        string message,
        string? relatedEntityType = null,
        int? relatedEntityId = null)
    {
        if (string.IsNullOrWhiteSpace(type))
            throw new ArgumentException(
                "Notification type is required.",
                nameof(type));

        if (string.IsNullOrWhiteSpace(title))
            throw new ArgumentException(
                "Notification title is required.",
                nameof(title));

        if (string.IsNullOrWhiteSpace(message))
            throw new ArgumentException(
                "Notification message is required.",
                nameof(message));

        var affectedUser = await _context.Users
            .AsNoTracking()
            .Include(x => x.ReportsToUser)
                .ThenInclude(x => x!.Role)
            .FirstOrDefaultAsync(x => x.Id == affectedUserId);

        if (affectedUser == null)
            throw new InvalidOperationException(
                "Affected user not found.");

        var recipientIds = new HashSet<int>();

        // -------------------------------------------------
        // IT recipients
        // -------------------------------------------------
        // Notify all active Super Admin and IT Admin users.
        var itRecipientIds = await _context.Users
            .AsNoTracking()
            .Where(x =>
                x.IsActive &&
                x.Role != null &&
                x.Role.IsActive &&
                (x.Role.Name == "Super Admin" ||
                 x.Role.Name == "IT Admin"))
            .Select(x => x.Id)
            .ToListAsync();

        foreach (var userId in itRecipientIds)
            recipientIds.Add(userId);

        // -------------------------------------------------
        // Reporting recipient
        // -------------------------------------------------
        // Only the affected user's specifically assigned
        // Team Lead or Manager receives the notification.
        var reportingUser = affectedUser.ReportsToUser;

        if (reportingUser != null &&
            reportingUser.IsActive &&
            reportingUser.Role != null &&
            reportingUser.Role.IsActive &&
            (reportingUser.Role.Name == "Team Lead" ||
             reportingUser.Role.Name == "Manager"))
        {
            recipientIds.Add(reportingUser.Id);
        }

        if (recipientIds.Count == 0)
            return 0;

        var normalizedType = type.Trim();
        var normalizedTitle = title.Trim();
        var normalizedMessage = message.Trim();

        foreach (var recipientId in recipientIds)
        {
            string? deduplicationKey = null;

            if (relatedEntityId.HasValue)
            {
                deduplicationKey =
                    $"{normalizedType}:{relatedEntityType ?? "Entity"}:" +
                    $"{relatedEntityId.Value}:User:{recipientId}";
            }

            // Extra application-level duplicate protection.
            if (deduplicationKey != null)
            {
                var exists = await _context.Notifications
                    .AnyAsync(x =>
                        x.DeduplicationKey ==
                        deduplicationKey);

                if (exists)
                    continue;
            }

            _context.Notifications.Add(
                new Notification
                {
                    UserId = recipientId,
                    Type = normalizedType,
                    Title = normalizedTitle,
                    Message = normalizedMessage,
                    RelatedEntityType =
                        string.IsNullOrWhiteSpace(
                            relatedEntityType)
                            ? null
                            : relatedEntityType.Trim(),
                    RelatedEntityId = relatedEntityId,
                    DeduplicationKey = deduplicationKey,
                    IsRead = false,
                    CreatedAt = DateTime.UtcNow
                });
        }

        return await _context.SaveChangesAsync();
    }
}
