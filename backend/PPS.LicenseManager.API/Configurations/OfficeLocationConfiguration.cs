using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class OfficeLocationConfiguration
    : IEntityTypeConfiguration<OfficeLocation>
{
    public void Configure(
        EntityTypeBuilder<OfficeLocation> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.LocationCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.LocationName)
            .HasMaxLength(150)
            .IsRequired();

        builder.Property(x => x.Address)
            .HasMaxLength(500);

        builder.Property(x => x.City)
            .HasMaxLength(100);

        builder.Property(x => x.State)
            .HasMaxLength(100);

        builder.Property(x => x.Country)
            .HasMaxLength(100)
            .HasDefaultValue("India");

        builder.HasIndex(x => new
        {
            x.CompanyId,
            x.LocationCode
        })
        .IsUnique();

        builder.HasOne(x => x.Company)
            .WithMany()
            .HasForeignKey(x => x.CompanyId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
