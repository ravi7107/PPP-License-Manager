namespace PPS.LicenseManager.API.DTOs.Availability;

public class UserUnavailabilityResponse
{
    public int Id { get; set; }

    public int UserId { get; set; }

    public string UserName { get; set; } = string.Empty;

    public string? EmployeeCode { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string EffectiveStatus { get; set; } = string.Empty;

    public int CreatedByUserId { get; set; }

    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; }

    public DateTime? CancelledAt { get; set; }

    public int? CancelledByUserId { get; set; }

    public string? CancelledBy { get; set; }
}
