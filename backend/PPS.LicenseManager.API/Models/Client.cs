using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class Client
{
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Code { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? ContactName { get; set; }

    [EmailAddress]
    [MaxLength(100)]
    public string? ContactEmail { get; set; }

    [Phone]
    [MaxLength(20)]
    public string? ContactPhone { get; set; }

    [MaxLength(500)]
    public string? Address { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public ICollection<LicensePurchase> LicensePurchases { get; set; }
        = new List<LicensePurchase>();
}
