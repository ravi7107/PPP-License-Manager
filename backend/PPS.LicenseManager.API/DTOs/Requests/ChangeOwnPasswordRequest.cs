using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Requests;

public class ChangeOwnPasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    [MaxLength(100)]
    public string NewPassword { get; set; } = string.Empty;
}
