using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Client;

public class UpdateClientRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [StringLength(20)]
    public string Code { get; set; } = string.Empty;

    [StringLength(100)]
    public string? ContactName { get; set; }

    [EmailAddress]
    [StringLength(100)]
    public string? ContactEmail { get; set; }

    [Phone]
    [StringLength(20)]
    public string? ContactPhone { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    public bool IsActive { get; set; }
}
