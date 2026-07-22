using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.DTOs.Company;

public class CreateCompanyRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;

    [StringLength(20)]
    public string? Code { get; set; }

    [StringLength(30)]
    public string? GSTNumber { get; set; }

    [StringLength(500)]
    public string? Address { get; set; }

    [StringLength(100)]
    public string? ContactPerson { get; set; }

    [EmailAddress]
    [StringLength(100)]
    public string? ContactEmail { get; set; }

    [Phone]
    [StringLength(20)]
    public string? ContactPhone { get; set; }
}
