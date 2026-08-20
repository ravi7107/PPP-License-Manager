using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Data;

public static class DbSeeder
{
    // Used only for the one-time seeded admin account below - not a
    // general-purpose password generator. 16 characters drawn from a set
    // that deliberately excludes visually-confusable characters (0/O,
    // 1/l/I) since an operator has to retype this from a log line.
    private const string PasswordChars =
        "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";

    private static string GenerateRandomPassword(int length = 16)
    {
        var chars = new char[length];

        // RandomNumberGenerator (not System.Random) because this seeds
        // the one account every fresh deployment starts with - it should
        // not be guessable.
        using var rng = RandomNumberGenerator.Create();
        var buffer = new byte[length];
        rng.GetBytes(buffer);

        for (var i = 0; i < length; i++)
        {
            chars[i] = PasswordChars[buffer[i] % PasswordChars.Length];
        }

        return new string(chars);
    }

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

        // Create admin only during initial setup. The password is
        // randomly generated (not a fixed default like the old
        // "Admin@123") and MustChangePassword is set so the frontend
        // forces a change before this account can do anything else - a
        // hardcoded default password is a real risk on a public
        // production deployment even if it's changed shortly after, since
        // there's a window where anyone who knows the codebase can log
        // in as Super Admin. The generated password is logged once below
        // so whoever runs the first deploy can retrieve it.
        var initialPassword = GenerateRandomPassword();

        var admin = new User
        {
            EmployeeCode = "EMP0001",
            FullName = "System Administrator",
            Email = "admin@pps.com",

            PasswordHash =
                BCrypt.Net.BCrypt.HashPassword(initialPassword),

            RoleId = superAdminRole.Id,
            IsActive = true,
            MustChangePassword = true,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(admin);
        await context.SaveChangesAsync();

        Console.WriteLine("=================================================");
        Console.WriteLine("Seeded initial Super Admin account:");
        Console.WriteLine("  Email:    admin@pps.com");
        Console.WriteLine($"  Password: {initialPassword}");
        Console.WriteLine("This password is shown only once, in this startup");
        Console.WriteLine("log. You will be required to change it on first login.");
        Console.WriteLine("=================================================");
    }
}
