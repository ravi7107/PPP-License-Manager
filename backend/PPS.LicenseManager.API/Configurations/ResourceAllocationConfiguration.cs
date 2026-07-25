using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class ResourceAllocationConfiguration : IEntityTypeConfiguration<ResourceAllocation>
{
    public void Configure(EntityTypeBuilder<ResourceAllocation> builder)
    {
       
	 builder.HasIndex(x => x.LicenseId)
         .IsUnique()
         .HasFilter("\"IsActive\" = true");
	 builder.HasKey(x => x.Id);

        builder.Property(x => x.AllocationReference)
            .IsRequired();

        builder.HasIndex(x => x.AllocationReference)
            .IsUnique();

        builder.Property(x => x.Status)
            .HasMaxLength(30)
            .IsRequired();

        builder.Property(x => x.Remarks)
            .HasMaxLength(500);

        builder.HasOne(x => x.License)
            .WithMany()
            .HasForeignKey(x => x.LicenseId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.User)
            .WithMany()
            .HasForeignKey(x => x.UserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Asset)
            .WithMany()
            .HasForeignKey(x => x.AssetId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.AllocatedByUser)
            .WithMany()
            .HasForeignKey(x => x.AllocatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
