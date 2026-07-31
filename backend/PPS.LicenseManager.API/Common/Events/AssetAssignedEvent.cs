namespace PPS.LicenseManager.API.Common.Events;

public sealed class AssetAssignedEvent : IEvent
{
    public int AssetId { get; init; }

    public int UserId { get; init; }

    public DateTime OccurredOn { get; } = DateTime.UtcNow;
}
