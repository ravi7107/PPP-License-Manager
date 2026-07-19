using System.ComponentModel.DataAnnotations;

namespace PPS.LicenseManager.API.Models;

public class User
{
    public int Id { get; set; }

    [Required]
    [MaxLength(20)]
    public string EmployeeCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string PasswordHash { get; set; } = string.Empty;

    public int RoleId { get; set; }
    public Role? Role { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? LastLogin { get; set; }
}
