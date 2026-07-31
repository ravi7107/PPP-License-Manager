using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class AssetTemporaryPoolConfiguration : IEntityTypeConfiguration<AssetTemporaryPool>
{
    public void Configure(EntityTypeBuilder<AssetTemporaryPool> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.Asset)
            .WithMany()
            .HasForeignKey(x => x.AssetId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.CurrentAssignment)
            .WithMany()
            .HasForeignKey(x => x.CurrentAssignmentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ReleasedByUser)
            .WithMany()
            .HasForeignKey(x => x.ReleasedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.AssetId);
        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.AvailableUntil);
    }
}
