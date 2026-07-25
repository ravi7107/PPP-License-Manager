using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class AllocationRequestConfiguration : IEntityTypeConfiguration<AllocationRequest>
{
    public void Configure(EntityTypeBuilder<AllocationRequest> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.RequestReference)
               .IsUnique();

        builder.Property(x => x.Priority)
               .HasMaxLength(30);

        builder.Property(x => x.Status)
               .HasMaxLength(30);

        builder.Property(x => x.BusinessJustification)
               .HasMaxLength(1000);

        builder.Property(x => x.Remarks)
               .HasMaxLength(500);

        builder.Property(x => x.RejectionReason)
               .HasMaxLength(500);

        builder.HasOne(x => x.Software)
               .WithMany()
               .HasForeignKey(x => x.SoftwareId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RequestedByUser)
               .WithMany()
               .HasForeignKey(x => x.RequestedByUserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ApprovedByUser)
               .WithMany()
               .HasForeignKey(x => x.ApprovedByUserId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Asset)
               .WithMany()
               .HasForeignKey(x => x.AssetId)
               .OnDelete(DeleteBehavior.Restrict);
    }
}
