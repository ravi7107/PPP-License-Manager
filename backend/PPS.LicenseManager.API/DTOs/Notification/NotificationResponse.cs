namespace PPS.LicenseManager.API.DTOs.Notification;

public class NotificationResponse
{
    public int Id { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Message { get; set; } = string.Empty;

    // Lets the frontend deep-link to the related record, e.g.
    // RelatedEntityType = "License", RelatedEntityId = 42.
    public string? RelatedEntityType { get; set; }

    public int? RelatedEntityId { get; set; }

    public bool IsRead { get; set; }

    public DateTime? ReadAt { get; set; }

    public DateTime CreatedAt { get; set; }
}
