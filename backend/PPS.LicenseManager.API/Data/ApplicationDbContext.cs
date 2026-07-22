using Microsoft.EntityFrameworkCore;
using PPS.LicenseManager.API.Models;


namespace PPS.LicenseManager.API.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
        : base(options)
    {
    }

    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Department> Departments => Set<Department>();
    public DbSet<License> Licenses => Set<License>();
   
    public DbSet<Software> Software => Set<Software>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<LicensePurchase> LicensePurchases => Set<LicensePurchase>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<Company> Companies { get; set; }
    // NEW
    public DbSet<AssetSoftware> AssetSoftwares => Set<AssetSoftware>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
	
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);
	modelBuilder.Entity<Department>()
        .HasOne(d => d.Company)
        .WithMany(c => c.Departments)
        .HasForeignKey(d => d.CompanyId)
        .OnDelete(DeleteBehavior.Restrict);

      modelBuilder.Entity<Vendor>()
    .HasIndex(v => v.VendorCode)
    .IsUnique();

        modelBuilder.Entity<Role>().HasData(
            new Role
            {
                Id = 1,
                Name = "Super Admin",
                Description = "Full system access",
                DisplayOrder = 1,
                IsActive = true
            },
            new Role
            {
                Id = 2,
                Name = "IT Admin",
                Description = "Manage users, assets and licenses",
                DisplayOrder = 2,
                IsActive = true
            },
            new Role
            {
                Id = 3,
                Name = "Team Lead",
                Description = "Approve license requests",
                DisplayOrder = 3,
                IsActive = true
            },
            new Role
            {
                Id = 4,
                Name = "Manager",
                Description = "View reports and approvals",
                DisplayOrder = 4,
                IsActive = true
            },
            new Role
            {
                Id = 5,
                Name = "Employee",
                Description = "Request and view assigned licenses",
                DisplayOrder = 5,
                IsActive = true
            }
        );

        modelBuilder.Entity<Asset>(entity =>
        {
            entity.HasKey(a => a.Id);

            entity.HasIndex(a => a.AssetTag)
                  .IsUnique();

            entity.Property(a => a.AssetTag)
                  .HasMaxLength(50)
                  .IsRequired();

            entity.Property(a => a.AssetName)
                  .HasMaxLength(150)
                  .IsRequired();

            entity.Property(a => a.AssetType)
                  .HasMaxLength(50)
                  .IsRequired();

            entity.Property(a => a.Manufacturer)
                  .HasMaxLength(100);

            entity.Property(a => a.Model)
                  .HasMaxLength(100);

            entity.Property(a => a.SerialNumber)
                  .HasMaxLength(100);

            entity.Property(a => a.HostName)
                  .HasMaxLength(100);

            entity.Property(a => a.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Available");

            entity.Property(a => a.IsReadyForAssignment)
                  .HasDefaultValue(true);

            entity.Property(a => a.IsActive)
                  .HasDefaultValue(true);

            entity.HasOne(a => a.Department)
                  .WithMany()
                  .HasForeignKey(a => a.DepartmentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // NEW - AssetSoftware
        modelBuilder.Entity<AssetSoftware>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Version)
                  .HasMaxLength(50);

            entity.Property(x => x.LicenseKey)
                  .HasMaxLength(255);

            entity.Property(x => x.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Installed");

            entity.Property(x => x.Remarks)
                  .HasMaxLength(500);

            entity.Property(x => x.IsActive)
                  .HasDefaultValue(true);

            entity.HasOne(x => x.Asset)
                  .WithMany(a => a.AssetSoftwares)
                  .HasForeignKey(x => x.AssetId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Software)
                  .WithMany(s => s.AssetSoftwares)
                  .HasForeignKey(x => x.SoftwareId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Prevent duplicate software assignment to the same asset
            entity.HasIndex(x => new { x.AssetId, x.SoftwareId })
                  .IsUnique();
        });
    }
}
