using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.ResourceAllocation;

public class ReleaseResourceAllocationRequest
{
    [MaxLength(500)]
    public string? Remarks { get; set; }
}
