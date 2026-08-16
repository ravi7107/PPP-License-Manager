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

    public DbSet<PurchaseRequisition> PurchaseRequisitions =>
        Set<PurchaseRequisition>();

    public DbSet<PurchaseRequisitionLineItem> PurchaseRequisitionLineItems =>
        Set<PurchaseRequisitionLineItem>();

    public DbSet<PurchaseRequisitionAttachment> PurchaseRequisitionAttachments =>
        Set<PurchaseRequisitionAttachment>();

    public DbSet<PurchaseRequisitionApprovalStep> PurchaseRequisitionApprovalSteps =>
        Set<PurchaseRequisitionApprovalStep>();

    public DbSet<PurchaseRequisitionApprovalToken> PurchaseRequisitionApprovalTokens =>
        Set<PurchaseRequisitionApprovalToken>();

    public DbSet<PurchaseRequisitionAuditLog> PurchaseRequisitionAuditLogs =>
        Set<PurchaseRequisitionAuditLog>();

    public DbSet<PurchaseRequisitionFinanceNotification> PurchaseRequisitionFinanceNotifications =>
        Set<PurchaseRequisitionFinanceNotification>();

    // Material Movement Management module
    public DbSet<MaterialItemCategory> MaterialItemCategories =>
        Set<MaterialItemCategory>();

    public DbSet<MaterialItem> MaterialItems =>
        Set<MaterialItem>();

    public DbSet<MaterialCostCenter> MaterialCostCenters =>
        Set<MaterialCostCenter>();

    public DbSet<MaterialTransporter> MaterialTransporters =>
        Set<MaterialTransporter>();

    public DbSet<MaterialMovement> MaterialMovements =>
        Set<MaterialMovement>();

    public DbSet<MaterialMovementItem> MaterialMovementItems =>
        Set<MaterialMovementItem>();

    public DbSet<MaterialApprovalWorkflow> MaterialApprovalWorkflows =>
        Set<MaterialApprovalWorkflow>();

    public DbSet<MaterialApprovalWorkflowStep> MaterialApprovalWorkflowSteps =>
        Set<MaterialApprovalWorkflowStep>();

    public DbSet<MaterialMovementApproval> MaterialMovementApprovals =>
        Set<MaterialMovementApproval>();

    public DbSet<MaterialMovementDispatch> MaterialMovementDispatches =>
        Set<MaterialMovementDispatch>();

    public DbSet<MaterialMovementReceipt> MaterialMovementReceipts =>
        Set<MaterialMovementReceipt>();

    public DbSet<MaterialMovementReceiptItem> MaterialMovementReceiptItems =>
        Set<MaterialMovementReceiptItem>();

    public DbSet<MaterialMovementReturn> MaterialMovementReturns =>
        Set<MaterialMovementReturn>();

    public DbSet<MaterialMovementAttachment> MaterialMovementAttachments =>
        Set<MaterialMovementAttachment>();

    public DbSet<MaterialMovementAuditLog> MaterialMovementAuditLogs =>
        Set<MaterialMovementAuditLog>();

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

            entity.Property(x => x.WorkMode)
                  .HasMaxLength(20)
                  .HasDefaultValue("Office")
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

            entity.Property(x => x.RequestReason)
                  .HasMaxLength(30)
                  .HasDefaultValue("Unavailability")
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

            entity.Property(x => x.RequestType)
                  .HasMaxLength(20)
                  .HasDefaultValue("Reassign")
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

        // ------------------------------------------------------------------
        // Purchase Requisition module
        // ------------------------------------------------------------------

        modelBuilder.Entity<PurchaseRequisition>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasIndex(x => x.PrNumber)
                  .IsUnique();

            entity.Property(x => x.Status)
                  .HasMaxLength(20)
                  .HasDefaultValue("Draft")
                  .IsRequired();

            entity.Property(x => x.Currency)
                  .HasMaxLength(3)
                  .HasDefaultValue("INR")
                  .IsRequired();

            entity.Property(x => x.SubtotalAmount).HasPrecision(18, 2);
            entity.Property(x => x.CgstPercent).HasPrecision(5, 2).HasDefaultValue(9m);
            entity.Property(x => x.SgstPercent).HasPrecision(5, 2).HasDefaultValue(9m);
            entity.Property(x => x.TaxAmount).HasPrecision(18, 2);
            entity.Property(x => x.TotalAmount).HasPrecision(18, 2);

            entity.HasIndex(x => x.CompanyId);
            entity.HasIndex(x => x.DepartmentId);
            entity.HasIndex(x => x.RequestedByUserId);
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.VendorId);

            entity.HasOne(x => x.Company)
                  .WithMany()
                  .HasForeignKey(x => x.CompanyId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Optional (see PurchaseRequisition.DepartmentId's comment) -
            // no longer collected on the form, kept only for PRs created
            // before this change.
            entity.HasOne(x => x.Department)
                  .WithMany()
                  .HasForeignKey(x => x.DepartmentId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .IsRequired(false);

            entity.HasOne(x => x.RequestedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.RequestedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Optional - no reverse Vendor.PurchaseRequisitions collection,
            // this is a one-way lookup for the PDF/detail view.
            entity.HasOne(x => x.Vendor)
                  .WithMany()
                  .HasForeignKey(x => x.VendorId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseRequisitionLineItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Quantity).HasPrecision(18, 2);
            entity.Property(x => x.UnitPrice).HasPrecision(18, 2);
            entity.Property(x => x.LineTotal).HasPrecision(18, 2);

            entity.HasIndex(x => x.PurchaseRequisitionId);

            entity.HasOne(x => x.PurchaseRequisition)
                  .WithMany(x => x.LineItems)
                  .HasForeignKey(x => x.PurchaseRequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PurchaseRequisitionAttachment>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.AttachmentType)
                  .HasMaxLength(30)
                  .HasDefaultValue("VendorQuotation")
                  .IsRequired();

            entity.HasIndex(x => x.PurchaseRequisitionId);
            entity.HasIndex(x => x.UploadedByUserId);

            entity.HasOne(x => x.PurchaseRequisition)
                  .WithMany(x => x.Attachments)
                  .HasForeignKey(x => x.PurchaseRequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.UploadedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.UploadedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseRequisitionApprovalStep>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status)
                  .HasMaxLength(20)
                  .HasDefaultValue("Pending")
                  .IsRequired();

            entity.HasIndex(x => x.PurchaseRequisitionId);
            entity.HasIndex(x => x.AssignedApproverUserId);
            entity.HasIndex(x => x.Status);

            entity.HasIndex(x => new { x.PurchaseRequisitionId, x.StepOrder })
                  .IsUnique();

            entity.HasOne(x => x.PurchaseRequisition)
                  .WithMany(x => x.ApprovalSteps)
                  .HasForeignKey(x => x.PurchaseRequisitionId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.AssignedApproverUser)
                  .WithMany()
                  .HasForeignKey(x => x.AssignedApproverUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseRequisitionApprovalToken>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.HasIndex(x => x.TokenHash)
                  .IsUnique();

            entity.HasIndex(x => x.PurchaseRequisitionApprovalStepId);

            entity.HasOne(x => x.ApprovalStep)
                  .WithMany(x => x.Tokens)
                  .HasForeignKey(x => x.PurchaseRequisitionApprovalStepId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<PurchaseRequisitionAuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.PerformedVia)
                  .HasMaxLength(20)
                  .HasDefaultValue("WebApp")
                  .IsRequired();

            entity.Property(x => x.Details)
                  .HasColumnType("text");

            entity.HasIndex(x => x.PurchaseRequisitionId);
            entity.HasIndex(x => x.CreatedAt);

            entity.HasOne(x => x.PurchaseRequisition)
                  .WithMany()
                  .HasForeignKey(x => x.PurchaseRequisitionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.PerformedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.PerformedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<PurchaseRequisitionFinanceNotification>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.DeliveryStatus)
                  .HasMaxLength(20)
                  .HasDefaultValue("Sent")
                  .IsRequired();

            entity.HasIndex(x => x.PurchaseRequisitionId);
            entity.HasIndex(x => x.SentByUserId);

            entity.HasOne(x => x.PurchaseRequisition)
                  .WithMany()
                  .HasForeignKey(x => x.PurchaseRequisitionId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.SentByUser)
                  .WithMany()
                  .HasForeignKey(x => x.SentByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        // ------------------------------------------------------------------
        // Material Movement Management module - masters (Phase 3 foundation;
        // the movement/approval/dispatch/receipt/return transaction tables
        // land in a follow-up migration).
        // ------------------------------------------------------------------

        modelBuilder.Entity<MaterialItemCategory>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).HasMaxLength(100).IsRequired();
            entity.Property(x => x.Code).HasMaxLength(20).IsRequired();
            entity.Property(x => x.IsActive).HasDefaultValue(true);

            entity.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<MaterialItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ItemCode).HasMaxLength(30).IsRequired();
            entity.Property(x => x.ItemName).HasMaxLength(200).IsRequired();
            entity.Property(x => x.MaterialType).HasMaxLength(30).HasDefaultValue("Stock").IsRequired();
            entity.Property(x => x.UnitOfMeasure).HasMaxLength(20);
            entity.Property(x => x.IsSerialized).HasDefaultValue(false);
            entity.Property(x => x.IsActive).HasDefaultValue(true);

            entity.HasIndex(x => x.ItemCode).IsUnique();
            entity.HasIndex(x => x.CategoryId);
            entity.HasIndex(x => x.MaterialType);

            entity.HasOne(x => x.Category)
                  .WithMany()
                  .HasForeignKey(x => x.CategoryId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialCostCenter>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Code).HasMaxLength(20).IsRequired();
            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.IsActive).HasDefaultValue(true);

            entity.HasIndex(x => x.Code).IsUnique();
            entity.HasIndex(x => x.CompanyId);

            // Optional - global (usable by every entity) when null, matching
            // how MaterialTransporters has no company scope at all.
            entity.HasOne(x => x.Company)
                  .WithMany()
                  .HasForeignKey(x => x.CompanyId)
                  .OnDelete(DeleteBehavior.Restrict)
                  .IsRequired(false);
        });

        modelBuilder.Entity<MaterialTransporter>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.ContactName).HasMaxLength(100);
            entity.Property(x => x.ContactPhone).HasMaxLength(30);
            entity.Property(x => x.ContactEmail).HasMaxLength(150);
            entity.Property(x => x.VehicleDetails).HasMaxLength(300);
            entity.Property(x => x.IsActive).HasDefaultValue(true);
        });

        // ------------------------------------------------------------------
        // Material Movement Management module - core transaction tables
        // (movements, items, approval matrix + per-movement approvals,
        // dispatch, receipt, return, attachments, audit log).
        // ------------------------------------------------------------------

        modelBuilder.Entity<MaterialMovement>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.MovementNumber).HasMaxLength(30);
            entity.Property(x => x.MovementType).HasMaxLength(30).IsRequired();
            entity.Property(x => x.Status).HasMaxLength(30).HasDefaultValue("Draft").IsRequired();

            entity.HasIndex(x => x.MovementNumber).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.MovementType);
            entity.HasIndex(x => x.FromCompanyId);
            entity.HasIndex(x => x.FromLocationId);
            entity.HasIndex(x => x.FromDepartmentId);
            entity.HasIndex(x => x.FromCostCenterId);
            entity.HasIndex(x => x.ToCompanyId);
            entity.HasIndex(x => x.ToLocationId);
            entity.HasIndex(x => x.ToDepartmentId);
            entity.HasIndex(x => x.ToCostCenterId);
            entity.HasIndex(x => x.VendorId);
            entity.HasIndex(x => x.RequestedByUserId);
            entity.HasIndex(x => x.ApprovalWorkflowId);

            entity.HasOne(x => x.FromCompany).WithMany().HasForeignKey(x => x.FromCompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.FromLocation).WithMany().HasForeignKey(x => x.FromLocationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.FromDepartment).WithMany().HasForeignKey(x => x.FromDepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.FromCostCenter).WithMany().HasForeignKey(x => x.FromCostCenterId).OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ToCompany).WithMany().HasForeignKey(x => x.ToCompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ToLocation).WithMany().HasForeignKey(x => x.ToLocationId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ToDepartment).WithMany().HasForeignKey(x => x.ToDepartmentId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ToCostCenter).WithMany().HasForeignKey(x => x.ToCostCenterId).OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Vendor).WithMany().HasForeignKey(x => x.VendorId).OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.RequestedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.RequestedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Optional - no reverse collection on MaterialApprovalWorkflow,
            // same one-way-lookup shape as PurchaseRequisition.Vendor.
            entity.HasOne(x => x.ApprovalWorkflow)
                  .WithMany()
                  .HasForeignKey(x => x.ApprovalWorkflowId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Quantity).HasPrecision(18, 2);
            entity.Property(x => x.UnitOfMeasure).HasMaxLength(20);
            entity.Property(x => x.SerialNumbers).HasMaxLength(500);
            entity.Property(x => x.Condition).HasMaxLength(30);
            entity.Property(x => x.Remarks).HasMaxLength(500);

            entity.HasIndex(x => x.MovementId);
            entity.HasIndex(x => x.ItemId);
            entity.HasIndex(x => x.AssetId);

            entity.HasOne(x => x.Movement)
                  .WithMany(x => x.Items)
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.Item)
                  .WithMany()
                  .HasForeignKey(x => x.ItemId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Asset)
                  .WithMany()
                  .HasForeignKey(x => x.AssetId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialApprovalWorkflow>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name).HasMaxLength(150).IsRequired();
            entity.Property(x => x.MovementType).HasMaxLength(30);
            entity.Property(x => x.MinValue).HasPrecision(18, 2);
            entity.Property(x => x.MaxValue).HasPrecision(18, 2);
            entity.Property(x => x.IsActive).HasDefaultValue(true);
            entity.Property(x => x.Priority).HasDefaultValue(100);

            entity.HasIndex(x => x.MovementType);
            entity.HasIndex(x => x.IsActive);
            entity.HasIndex(x => x.Priority);
            entity.HasIndex(x => x.FromCompanyId);
            entity.HasIndex(x => x.ToCompanyId);

            entity.HasOne(x => x.FromCompany).WithMany().HasForeignKey(x => x.FromCompanyId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ToCompany).WithMany().HasForeignKey(x => x.ToCompanyId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialApprovalWorkflowStep>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ApproverRole).HasMaxLength(50);
            entity.Property(x => x.IsMandatory).HasDefaultValue(true);

            entity.HasIndex(x => x.WorkflowId);
            entity.HasIndex(x => new { x.WorkflowId, x.StepOrder }).IsUnique();
            entity.HasIndex(x => x.ApproverUserId);
            entity.HasIndex(x => x.ApproverDepartmentId);

            entity.HasOne(x => x.Workflow)
                  .WithMany(x => x.Steps)
                  .HasForeignKey(x => x.WorkflowId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ApproverUser).WithMany().HasForeignKey(x => x.ApproverUserId).OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(x => x.ApproverDepartment).WithMany().HasForeignKey(x => x.ApproverDepartmentId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementApproval>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending").IsRequired();
            entity.Property(x => x.Comments).HasMaxLength(500);

            entity.HasIndex(x => x.MovementId);
            entity.HasIndex(x => new { x.MovementId, x.StepOrder }).IsUnique();
            entity.HasIndex(x => x.ApproverUserId);
            entity.HasIndex(x => x.Status);

            entity.HasOne(x => x.Movement)
                  .WithMany(x => x.Approvals)
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ApproverUser)
                  .WithMany()
                  .HasForeignKey(x => x.ApproverUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementDispatch>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.VehicleNumber).HasMaxLength(30);
            entity.Property(x => x.GatePassNumber).HasMaxLength(30);
            entity.Property(x => x.GatePassPdfPath).HasMaxLength(300);
            entity.Property(x => x.QrPayload).HasMaxLength(500);

            entity.HasIndex(x => x.MovementId).IsUnique();
            entity.HasIndex(x => x.GatePassNumber).IsUnique();
            entity.HasIndex(x => x.TransporterId);
            entity.HasIndex(x => x.DispatchedByUserId);

            entity.HasOne(x => x.Movement)
                  .WithMany()
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.DispatchedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.DispatchedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.Transporter)
                  .WithMany()
                  .HasForeignKey(x => x.TransporterId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementReceipt>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.DiscrepancyNotes).HasColumnType("text");

            entity.HasIndex(x => x.MovementId).IsUnique();
            entity.HasIndex(x => x.ReceivedByUserId);

            entity.HasOne(x => x.Movement)
                  .WithMany()
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ReceivedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.ReceivedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementReceiptItem>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.QuantityReceived).HasPrecision(18, 2);
            entity.Property(x => x.Condition).HasMaxLength(30);
            entity.Property(x => x.DiscrepancyNotes).HasMaxLength(500);

            entity.HasIndex(x => x.ReceiptId);
            entity.HasIndex(x => x.MovementItemId);

            entity.HasOne(x => x.Receipt)
                  .WithMany(x => x.ReceiptItems)
                  .HasForeignKey(x => x.ReceiptId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.MovementItem)
                  .WithMany()
                  .HasForeignKey(x => x.MovementItemId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementReturn>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Status).HasMaxLength(20).HasDefaultValue("Pending").IsRequired();
            entity.Property(x => x.Remarks).HasMaxLength(500);

            entity.HasIndex(x => x.MovementId).IsUnique();
            entity.HasIndex(x => x.Status);
            entity.HasIndex(x => x.ReturnedByUserId);

            entity.HasOne(x => x.Movement)
                  .WithMany()
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.ReturnedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.ReturnedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementAttachment>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.FileName).HasMaxLength(260).IsRequired();
            entity.Property(x => x.StoredPath).HasMaxLength(300).IsRequired();
            entity.Property(x => x.ContentType).HasMaxLength(100).IsRequired();

            entity.HasIndex(x => x.MovementId);
            entity.HasIndex(x => x.UploadedByUserId);

            entity.HasOne(x => x.Movement)
                  .WithMany(x => x.Attachments)
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(x => x.UploadedByUser)
                  .WithMany()
                  .HasForeignKey(x => x.UploadedByUserId)
                  .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<MaterialMovementAuditLog>(entity =>
        {
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Action).HasMaxLength(50).IsRequired();
            entity.Property(x => x.Details).HasColumnType("text");
            entity.Property(x => x.IpAddress).HasMaxLength(50);

            entity.HasIndex(x => x.MovementId);
            entity.HasIndex(x => x.ActionAt);
            entity.HasIndex(x => x.ActorUserId);

            entity.HasOne(x => x.Movement)
                  .WithMany()
                  .HasForeignKey(x => x.MovementId)
                  .OnDelete(DeleteBehavior.Restrict);

            entity.HasOne(x => x.ActorUser)
                  .WithMany()
                  .HasForeignKey(x => x.ActorUserId)
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

            entity.Property(a => a.OwnershipType)
                  .HasMaxLength(20)
                  .HasDefaultValue("Owned");

            entity.HasOne(a => a.Department)
                  .WithMany()
                  .HasForeignKey(a => a.DepartmentId)
                  .OnDelete(DeleteBehavior.Restrict);

            // Material Movement Management module - see Asset.CurrentLocationId's
            // comment. SetNull (not Restrict) because a location being retired
            // shouldn't block deleting it just because an asset once sat there.
            entity.HasIndex(a => a.CurrentLocationId);

            entity.HasOne(a => a.CurrentLocation)
                  .WithMany()
                  .HasForeignKey(a => a.CurrentLocationId)
                  .OnDelete(DeleteBehavior.SetNull);

            // Rental tracking - see Asset.VendorId's comment. SetNull (not
            // Restrict) for the same reason as CurrentLocation above: a
            // vendor being deactivated/removed shouldn't block that,
            // it just leaves the asset's rental vendor blank.
            entity.HasIndex(a => a.VendorId);

            entity.HasOne(a => a.Vendor)
                  .WithMany()
                  .HasForeignKey(a => a.VendorId)
                  .OnDelete(DeleteBehavior.SetNull);
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
