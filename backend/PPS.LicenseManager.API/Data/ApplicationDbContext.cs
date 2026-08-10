using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;
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
    public DbSet<Company> Companies => Set<Company>();
    public DbSet<Client> Clients => Set<Client>();
    public DbSet<Vendor> Vendors => Set<Vendor>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Software> Software => Set<Software>();
    public DbSet<AssetTemporaryPool> AssetTemporaryPools => Set<AssetTemporaryPool>();

public DbSet<AssetPoolRequest> AssetPoolRequests => Set<AssetPoolRequest>();
    public DbSet<Asset> Assets => Set<Asset>();
    public DbSet<AssetSoftware> AssetSoftwares => Set<AssetSoftware>();
    public DbSet<AssetAssignment> AssetAssignments =>
        Set<AssetAssignment>();

    public DbSet<OfficeLocation> OfficeLocations =>
        Set<OfficeLocation>();

    public DbSet<OfficeFloor> OfficeFloors =>
        Set<OfficeFloor>();

    public DbSet<OfficeSeat> OfficeSeats =>
        Set<OfficeSeat>();

    public DbSet<License> Licenses => Set<License>();
    public DbSet<LicensePurchase> LicensePurchases => Set<LicensePurchase>();

    public DbSet<ResourceAllocation> ResourceAllocations => Set<ResourceAllocation>();
    public DbSet<AllocationRequest> AllocationRequests => Set<AllocationRequest>();

    public DbSet<UserUnavailability> UserUnavailabilities => Set<UserUnavailability>();
    public DbSet<ResourceReallocationRequest> ResourceReallocationRequests => Set<ResourceReallocationRequest>();

    public DbSet<AssetReallocationRequest> AssetReallocationRequests =>
        Set<AssetReallocationRequest>();

    public DbSet<Notification> Notifications => Set<Notification>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Automatically apply all IEntityTypeConfiguration<T>
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        // Department -> Company
        modelBuilder.Entity<Department>()
            .HasOne(d => d.Company)
            .WithMany(c => c.Departments)
            .HasForeignKey(d => d.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        // User -> Company
        modelBuilder.Entity<User>()
            .HasOne(u => u.Company)
            .WithMany(c => c.Users)
            .HasForeignKey(u => u.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);

        // User -> Department
        modelBuilder.Entity<User>()
            .HasOne(u => u.Department)
            .WithMany(d => d.Users)
            .HasForeignKey(u => u.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);

        // User -> Reporting Manager / Team Lead
        modelBuilder.Entity<User>()
            .HasOne(u => u.ReportsToUser)
            .WithMany(u => u.DirectReports)
            .HasForeignKey(u => u.ReportsToUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<User>()
            .HasIndex(u => u.ReportsToUserId);

        // Asset Assignment
        modelBuilder.Entity<AssetAssignment>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Assigned")
                  .IsRequired();

            entity.Property(x => x.Remarks)
                  .HasMaxLength(500);

            entity.HasIndex(x => x.AssetId);
            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.AssignedByUserId);
            entity.HasIndex(x => x.Status);

            entity.HasIndex(x => x.AssetId)
                  .IsUnique()
                  .HasFilter("\"IsActive\" = true");

            entity.HasOne(x => x.Asset)
                  .WithMany()
                  .HasForeignKey(x => x.AssetId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.User)
                  .WithMany()
                  .HasForeignKey(x => x.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.AssignedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.AssignedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasIndex(x => x.SeatId);

            entity.HasOne(x => x.Seat)
                  .WithMany()
                  .HasForeignKey(x => x.SeatId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Office Seat -> Asset
        modelBuilder.Entity<OfficeSeat>()
            .HasOne(x => x.Asset)
            .WithMany()
            .HasForeignKey(x => x.AssetId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OfficeSeat>()
            .HasIndex(x => x.AssetId);

        // Office Seat -> User
        modelBuilder.Entity<OfficeSeat>()
            .HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<OfficeSeat>()
            .HasIndex(x => x.UserId);

        // Vendor
        modelBuilder.Entity<Vendor>()
            .HasIndex(v => v.VendorCode)
            .IsUnique();

        // User Unavailability
        modelBuilder.Entity<UserUnavailability>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Reason)
                  .HasMaxLength(500)
                  .IsRequired();

            entity.Property(x => x.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Active")
                  .IsRequired();

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => new
            {
                x.UserId,
                x.StartDate,
                x.EndDate
            });

            entity.HasOne(x => x.User)
                  .WithMany()
                  .HasForeignKey(x => x.UserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.CreatedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.CreatedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.CancelledByUser)
                  .WithMany()
                  .HasForeignKey(x => x.CancelledByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Resource Reallocation Request
        modelBuilder.Entity<ResourceReallocationRequest>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasIndex(x => x.RequestReference)
                  .IsUnique();

            entity.HasIndex(x => x.UserUnavailabilityId);
            entity.HasIndex(x => x.ResourceAllocationId);
            entity.HasIndex(x => x.TargetUserId);
            entity.HasIndex(x => x.RequestedByUserId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.ResultingAllocationId);

            entity.Property(x => x.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Pending")
                  .IsRequired();

            entity.Property(x => x.Remarks)
                  .HasMaxLength(500);

            entity.Property(x => x.DecisionRemarks)
                  .HasMaxLength(500);

            entity.Property(x => x.ReturnRemarks)
                  .HasMaxLength(500);

            entity.HasIndex(x => x.ReturnedByUserId);
            entity.HasIndex(x => x.ReturnAllocationId);

            entity.HasOne(x => x.ReturnedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.ReturnedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ReturnAllocation)
                  .WithMany()
                  .HasForeignKey(x => x.ReturnAllocationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.UserUnavailability)
                  .WithMany()
                  .HasForeignKey(x => x.UserUnavailabilityId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ResourceAllocation)
                  .WithMany()
                  .HasForeignKey(x => x.ResourceAllocationId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.TargetUser)
                  .WithMany()
                  .HasForeignKey(x => x.TargetUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.RequestedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.RequestedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.DecidedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.DecidedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ResultingAllocation)
                  .WithMany()
                  .HasForeignKey(x => x.ResultingAllocationId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Asset Reallocation Request
        modelBuilder.Entity<AssetReallocationRequest>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status)
                  .HasMaxLength(30)
                  .HasDefaultValue("Pending")
                  .IsRequired();

            entity.Property(x => x.AdminDecision)
                  .HasMaxLength(20)
                  .HasDefaultValue("Pending")
                  .IsRequired();

            entity.Property(x => x.ItDecision)
                  .HasMaxLength(20)
                  .HasDefaultValue("Pending")
                  .IsRequired();

            entity.Property(x => x.Remarks).HasMaxLength(500);
            entity.Property(x => x.AdminRemarks).HasMaxLength(500);
            entity.Property(x => x.ItRemarks).HasMaxLength(500);

            entity.HasIndex(x => x.AssetId);
            entity.HasIndex(x => x.CurrentAssignmentId);
            entity.HasIndex(x => x.RequestedByUserId);
            entity.HasIndex(x => x.ProposedUserId);
            entity.HasIndex(x => x.ProposedSeatId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.ResultingAssignmentId);
            entity.HasIndex(x => x.AdminDecidedByUserId);
            entity.HasIndex(x => x.ItDecidedByUserId);

            entity.HasOne(x => x.Asset)
                  .WithMany()
                  .HasForeignKey(x => x.AssetId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.CurrentAssignment)
                  .WithMany()
                  .HasForeignKey(x => x.CurrentAssignmentId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.RequestedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.RequestedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ProposedUser)
                  .WithMany()
                  .HasForeignKey(x => x.ProposedUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ProposedSeat)
                  .WithMany()
                  .HasForeignKey(x => x.ProposedSeatId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.AdminDecidedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.AdminDecidedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ItDecidedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.ItDecidedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ResultingAssignment)
                  .WithMany()
                  .HasForeignKey(x => x.ResultingAssignmentId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Notification
        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Type)
                  .HasMaxLength(50)
                  .IsRequired();

            entity.Property(x => x.Title)
                  .HasMaxLength(200)
                  .IsRequired();

            entity.Property(x => x.Message)
                  .HasMaxLength(1000)
                  .IsRequired();

            entity.Property(x => x.RelatedEntityType)
                  .HasMaxLength(100);

            entity.Property(x => x.DeduplicationKey)
                  .HasMaxLength(200);

            entity.Property(x => x.IsRead)
                  .HasDefaultValue(false);

            entity.HasIndex(x => x.UserId);
            entity.HasIndex(x => x.IsRead);
            entity.HasIndex(x => x.CreatedAt);

            entity.HasIndex(x => x.DeduplicationKey)
                  .IsUnique();

            entity.HasOne(x => x.User)
                  .WithMany()
                  .HasForeignKey(x => x.UserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // Seed Roles
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

        // Asset
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

        // Asset Software
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

            entity.HasIndex(x => new { x.AssetId, x.SoftwareId })
                  .IsUnique();
        });

        // ------------------------------------------------------------------
        // PostgreSQL's "timestamp with time zone" columns reject DateTime
        // values whose Kind isn't Utc. Incoming dates from JSON requests
        // (e.g. date pickers) deserialize with Kind=Unspecified, which
        // throws at save time ("Cannot write DateTime with Kind=Unspecified
        // to PostgreSQL type 'timestamp with time zone'"). Rather than fix
        // this one field at a time across every module, treat every
        // DateTime/DateTime? property in the model as UTC globally.
        // ------------------------------------------------------------------
        var utcConverter = new ValueConverter<DateTime, DateTime>(
            v => v.Kind == DateTimeKind.Utc
                ? v
                : DateTime.SpecifyKind(v, DateTimeKind.Utc),
            v => DateTime.SpecifyKind(v, DateTimeKind.Utc));

        var nullableUtcConverter = new ValueConverter<DateTime?, DateTime?>(
            v => v.HasValue
                ? (v.Value.Kind == DateTimeKind.Utc
                    ? v.Value
                    : DateTime.SpecifyKind(v.Value, DateTimeKind.Utc))
                : v,
            v => v.HasValue
                ? DateTime.SpecifyKind(v.Value, DateTimeKind.Utc)
                : v);

        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            foreach (var property in entityType.GetProperties())
            {
                if (property.ClrType == typeof(DateTime))
                {
                    property.SetValueConverter(utcConverter);
                }
                else if (property.ClrType == typeof(DateTime?))
                {
                    property.SetValueConverter(nullableUtcConverter);
                }
            }
        }
    }
}
