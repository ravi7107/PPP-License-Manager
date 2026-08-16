namespace PPS.LicenseManager.API.DTOs.PurchaseRequisition;

public class PurchaseRequisitionContactResponse
{
    public int Id { get; set; }

    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string ContactType { get; set; } = string.Empty;

    public int? CompanyId { get; set; }

    public string? CompanyName { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }
}
