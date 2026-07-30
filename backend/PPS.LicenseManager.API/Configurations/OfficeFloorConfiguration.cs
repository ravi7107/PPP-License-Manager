using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class OfficeFloorConfiguration
    : IEntityTypeConfiguration<OfficeFloor>
{
    public void Configure(
        EntityTypeBuilder<OfficeFloor> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.FloorCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.FloorName)
            .HasMaxLength(100)
            .IsRequired();

        builder.HasIndex(x => new
        {
            x.OfficeLocationId,
            x.FloorCode
        })
        .IsUnique();

        builder.HasOne(x => x.OfficeLocation)
            .WithMany(x => x.Floors)
            .HasForeignKey(x => x.OfficeLocationId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
