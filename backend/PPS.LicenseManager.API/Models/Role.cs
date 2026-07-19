namespace PPS.LicenseManager.API.Models;

public class Role
{
    public int Id { get; set; }

    public int DisplayOrder { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<User> Users { get; set; } = new List<User>();
}
