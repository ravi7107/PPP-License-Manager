using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class LicenseConfiguration : IEntityTypeConfiguration<License>
{
    public void Configure(EntityTypeBuilder<License> builder)
    {
        builder.HasKey(x => x.Id);

        builder.HasIndex(x => x.AliasCode)
               .IsUnique();

        builder.Property(x => x.AliasCode)
               .HasMaxLength(30)
               .IsRequired();

        builder.Property(x => x.LicensedEmail)
               .HasMaxLength(100)
               .IsRequired();

        builder.Property(x => x.SubscriptionId)
               .HasMaxLength(100);

        builder.Property(x => x.Status)
               .HasMaxLength(30);

        builder.Property(x => x.PurchaseCost)
               .HasPrecision(18, 2);

        builder.Property(x => x.Remarks)
               .HasMaxLength(500);

        builder.HasOne(x => x.Software)
               .WithMany(x => x.Licenses)
               .HasForeignKey(x => x.SoftwareId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.LicensePurchase)
               .WithMany(x => x.Licenses)
               .HasForeignKey(x => x.LicensePurchaseId)
               .OnDelete(DeleteBehavior.Restrict);

        builder.HasIndex(x => x.LicensePurchaseId);
    }
}
