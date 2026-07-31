using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class AssetPoolRequestConfiguration : IEntityTypeConfiguration<AssetPoolRequest>
{
    public void Configure(EntityTypeBuilder<AssetPoolRequest> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasOne(x => x.TemporaryPool)
            .WithMany()
            .HasForeignKey(x => x.TemporaryPoolId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RequestedByUser)
            .WithMany()
            .HasForeignKey(x => x.RequestedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.RequestedForUser)
            .WithMany()
            .HasForeignKey(x => x.RequestedForUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.ApprovedByUser)
            .WithMany()
            .HasForeignKey(x => x.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.Status);
        builder.HasIndex(x => x.RequiredFrom);
    }
}
