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
}
