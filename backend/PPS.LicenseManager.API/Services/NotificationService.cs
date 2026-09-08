using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Data;
using PPS.LicenseManager.API.DTOs.Notification;
using PPS.LicenseManager.API.Models;
using PPS.LicenseManager.API.Services.Interfaces;

namespace PPS.LicenseManager.API.Services;

public class NotificationService : INotificationService
{
    private readonly ApplicationDbContext _context;

    // How many days before a License's ExpiryDate a "License expiring
    // soon" notification starts appearing in the bell. Matches the
    // "Expiring Soon" window already used by licenses-page.tsx's own
    // dashboard stat tile (frontend/app/pages/licenses/licenses-page.tsx)
    // - keep both in sync if this window ever changes.
    private const int LicenseExpiryWarningDays = 30;

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


    // =========================================================
    // NOTIFICATION BELL
    // =========================================================

    public async Task<List<NotificationResponse>> GetMyNotificationsAsync(
        int userId,
        int limit = 50)
    {
        await GenerateLicenseExpiringSoonNotificationsAsync();

        return await _context.Notifications
            .AsNoTracking()
            .Where(x => x.UserId == userId)
            .OrderByDescending(x => x.CreatedAt)
            .Take(limit)
            .Select(x => new NotificationResponse
            {
                Id = x.Id,
                Type = x.Type,
                Title = x.Title,
                Message = x.Message,
                RelatedEntityType = x.RelatedEntityType,
                RelatedEntityId = x.RelatedEntityId,
                IsRead = x.IsRead,
                ReadAt = x.ReadAt,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync();
    }

    public async Task<int> GetUnreadCountAsync(int userId)
    {
        await GenerateLicenseExpiringSoonNotificationsAsync();

        return await _context.Notifications
            .AsNoTracking()
            .CountAsync(x => x.UserId == userId && !x.IsRead);
    }

    public async Task<bool> MarkAsReadAsync(int notificationId, int userId)
    {
        var notification = await _context.Notifications
            .FirstOrDefaultAsync(x =>
                x.Id == notificationId && x.UserId == userId);

        if (notification == null)
            return false;

        if (!notification.IsRead)
        {
            notification.IsRead = true;
            notification.ReadAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }

        return true;
    }

    public async Task<int> MarkAllAsReadAsync(int userId)
    {
        var unread = await _context.Notifications
            .Where(x => x.UserId == userId && !x.IsRead)
            .ToListAsync();

        if (unread.Count == 0)
            return 0;

        var now = DateTime.UtcNow;

        foreach (var notification in unread)
        {
            notification.IsRead = true;
            notification.ReadAt = now;
        }

        await _context.SaveChangesAsync();

        return unread.Count;
    }


    // =========================================================
    // LICENSE EXPIRY NOTIFICATIONS
    // =========================================================
    // Generated on-demand (there is no background job/cron
    // infrastructure anywhere in this app - every other "expiring
    // soon"/"overdue" computation here, e.g. the Warranty Expiry report
    // and licenses-page.tsx's own dashboard tile, is likewise computed
    // at request/render time). Called from both read paths above so the
    // bell always reflects newly-due warnings the moment it's opened,
    // without needing a scheduler.

    private async Task GenerateLicenseExpiringSoonNotificationsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var cutoff = today.AddDays(LicenseExpiryWarningDays);

        // Deliberately no ".Date" on the ExpiryDate column inside this
        // query - date arithmetic inside an EF Core query is a common
        // source of provider-translation failures (see
        // ReportCenterService.BuildWarrantyExpiryBaseQuery's own comment
        // on this exact tradeoff). today/cutoff are already
        // midnight-aligned, so a plain >=/<= comparison against the
        // column is enough; day-count math below runs after
        // materialization instead.
        var expiringLicenses = await _context.Licenses
            .AsNoTracking()
            .Include(x => x.Software)
            .Where(x =>
                x.IsActive &&
                x.ExpiryDate >= today &&
                x.ExpiryDate <= cutoff)
            .ToListAsync();

        if (expiringLicenses.Count == 0)
            return;

        // Same "IT recipients" audience as NotifyItAndReportingManagerAsync
        // above - licenses have no single "affected user" the way a
        // reallocation request does, so this always goes to whoever
        // manages the license inventory rather than a per-license
        // reporting-manager lookup.
        var recipientIds = await _context.Users
            .AsNoTracking()
            .Where(x =>
                x.IsActive &&
                x.Role != null &&
                x.Role.IsActive &&
                (x.Role.Name == "Super Admin" ||
                 x.Role.Name == "IT Admin"))
            .Select(x => x.Id)
            .ToListAsync();

        if (recipientIds.Count == 0)
            return;

        // The expiry date (not just the license id) is baked into the
        // dedup key, so renewing a license (pushing ExpiryDate further
        // out) produces a fresh notification instead of staying
        // silenced by an old, already-read one for the same license.
        var candidateKeys = new List<string>();

        foreach (var license in expiringLicenses)
        {
            foreach (var recipientId in recipientIds)
            {
                candidateKeys.Add(BuildLicenseExpiringSoonKey(
                    license.Id, license.ExpiryDate, recipientId));
            }
        }

        var existingKeys = await _context.Notifications
            .AsNoTracking()
            .Where(x =>
                x.DeduplicationKey != null &&
                candidateKeys.Contains(x.DeduplicationKey))
            .Select(x => x.DeduplicationKey!)
            .ToListAsync();

        var existingKeySet = new HashSet<string>(existingKeys);
        var now = DateTime.UtcNow;

        foreach (var license in expiringLicenses)
        {
            var daysLeft = (license.ExpiryDate.Date - today).Days;

            var message = daysLeft <= 0
                ? $"License \"{license.AliasCode}\" ({license.Software.Name}) expires today."
                : $"License \"{license.AliasCode}\" ({license.Software.Name}) expires on " +
                  $"{license.ExpiryDate:MMM d, yyyy} " +
                  $"({daysLeft} day{(daysLeft == 1 ? "" : "s")} left).";

            foreach (var recipientId in recipientIds)
            {
                var deduplicationKey = BuildLicenseExpiringSoonKey(
                    license.Id, license.ExpiryDate, recipientId);

                if (existingKeySet.Contains(deduplicationKey))
                    continue;

                _context.Notifications.Add(new Notification
                {
                    UserId = recipientId,
                    Type = "LicenseExpiringSoon",
                    Title = "License expiring soon",
                    Message = message,
                    RelatedEntityType = "License",
                    RelatedEntityId = license.Id,
                    DeduplicationKey = deduplicationKey,
                    IsRead = false,
                    CreatedAt = now
                });

                // Guards against inserting the same key twice within
                // this same pass (not just against what was already in
                // the database).
                existingKeySet.Add(deduplicationKey);
            }
        }

        try
        {
            await _context.SaveChangesAsync();
        }
        catch (DbUpdateException)
        {
            // This runs on every GetMyNotificationsAsync/GetUnreadCountAsync
            // call (there's no background job to own it instead), so two
            // Super Admin/IT Admin users loading the app around the same
            // moment can both see "this dedup key doesn't exist yet" before
            // either commits. DeduplicationKey has a real DB-level unique
            // index (see the AddNotifications migration), so the losing
            // request's insert throws here - safe to swallow, since the
            // rows it was trying to create were already committed by
            // whichever request won the race. The caller's subsequent
            // SELECT reads them either way.
        }
    }

    private static string BuildLicenseExpiringSoonKey(
        int licenseId,
        DateTime expiryDate,
        int recipientId)
    {
        return $"LicenseExpiringSoon:License:{licenseId}:" +
            $"{expiryDate:yyyyMMdd}:User:{recipientId}";
    }
}
