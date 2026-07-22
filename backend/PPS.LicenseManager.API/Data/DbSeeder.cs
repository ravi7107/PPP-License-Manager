using BCrypt.Net;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        await context.Database.MigrateAsync();

        // If at least one user exists, do nothing.
        if (await context.Users.AnyAsync())
            return;

        // Get the Super Admin role.
        var superAdminRole = await context.Roles
            .FirstOrDefaultAsync(r => r.Name == "Super Admin");

        if (superAdminRole == null)
            return;

        var admin = new User
        {
            EmployeeCode = "EMP0001",
            FullName = "System Administrator",
            Email = "admin@pps.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
            RoleId = superAdminRole.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();
    }
}
