using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PPS.LicenseManager.API.Models;

namespace PPS.LicenseManager.API.Configurations;

public class OfficeSeatConfiguration
    : IEntityTypeConfiguration<OfficeSeat>
{
    public void Configure(
        EntityTypeBuilder<OfficeSeat> builder)
    {
        builder.HasKey(x => x.Id);

        builder.Property(x => x.SeatCode)
            .HasMaxLength(50)
            .IsRequired();

        builder.Property(x => x.SeatName)
            .HasMaxLength(100);

        builder.Property(x => x.XPosition)
            .HasPrecision(6, 3);

        builder.Property(x => x.YPosition)
            .HasPrecision(6, 3);

        builder.HasIndex(x => new
        {
            x.OfficeFloorId,
            x.SeatCode
        })
        .IsUnique();

        builder.HasOne(x => x.OfficeFloor)
            .WithMany(x => x.Seats)
            .HasForeignKey(x => x.OfficeFloorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(x => x.Department)
            .WithMany()
            .HasForeignKey(x => x.DepartmentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
