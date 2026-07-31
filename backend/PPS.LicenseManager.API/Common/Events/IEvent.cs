namespace PPS.LicenseManager.API.Common.Events;

public interface IEvent
{
    DateTime OccurredOn { get; }
}
