using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.MaterialMovement;

public class MarkReturnedRequest
{
    [MaxLength(500)]
    public string? Remarks { get; set; }
}
