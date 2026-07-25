using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.AllocationRequest;

public class RejectAllocationRequestRequest
{
    public int ApprovedByUserId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
}
