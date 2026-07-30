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

    // Organizational assignment
    // Nullable to preserve existing system/admin users.
    public int? CompanyId { get; set; }
    public Company? Company { get; set; }

    public int? DepartmentId { get; set; }
    public Department? Department { get; set; }

    // Organizational reporting relationship.
    // Identifies the Team Lead / Manager this user reports to.
    public int? ReportsToUserId { get; set; }

    public User? ReportsToUser { get; set; }

    public ICollection<User> DirectReports { get; set; } = new List<User>();

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UpdatedAt { get; set; }

    public DateTime? LastLogin { get; set; }
}
