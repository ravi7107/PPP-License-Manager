using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(ApplicationDbContext context)
    {
        // Apply pending database migrations
        var pendingMigrations =
            await context.Database.GetPendingMigrationsAsync();

        if (pendingMigrations.Any())
        {
            await context.Database.MigrateAsync();
        }

        // Never modify an existing admin account
        var existingAdmin = await context.Users
            .FirstOrDefaultAsync(u => u.Email == "admin@pps.com");

        if (existingAdmin != null)
        {
            return;
        }

        // Find Super Admin role
        var superAdminRole = await context.Roles
            .FirstOrDefaultAsync(r => r.Name == "Super Admin");

        if (superAdminRole == null)
        {
            throw new InvalidOperationException(
                "Super Admin role does not exist."
            );
        }

        // Create admin only during initial setup
        var admin = new User
        {
            EmployeeCode = "EMP0001",
            FullName = "System Administrator",
            Email = "admin@pps.com",

            PasswordHash =
                BCrypt.Net.BCrypt.HashPassword("Admin@123"),

            RoleId = superAdminRole.Id,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();
    }
}
