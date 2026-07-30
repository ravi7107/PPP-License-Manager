using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.ResourceAllocation;

public class TransferResourceAllocationRequest
{
    [Required]
    public int NewUserId { get; set; }

    public int? NewAssetId { get; set; }

    [Required]
    public int TransferredByUserId { get; set; }

    public DateTime? ExpectedReturnDate { get; set; }

    [MaxLength(500)]
    public string? Remarks { get; set; }
}
