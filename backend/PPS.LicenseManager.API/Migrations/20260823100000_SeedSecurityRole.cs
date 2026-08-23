using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Adds a "Security" role, needed for the QR-driven material movement
    // transfer/receive flow (Security staff confirm physical dispatch/
    // receipt via the mobile scanner app - see MaterialMovementService's
    // upcoming Transfer/Receive endpoints). Mirrors SeedDefaultRoles.cs's
    // exact InsertData/DeleteData shape - Id 6 continues on from the 5
    // roles seeded there.
    //
    // Like 20260822150000_WidenPurchaseRequisitionLineItemDescription.cs,
    // this skips the separate Designer.cs and puts the [DbContext]/
    // [Migration] attributes directly on this class - that pair is what
    // Database.MigrateAsync() actually uses to discover and apply a
    // migration (see DbSeeder.SeedAsync; there's no dotnet-ef CLI
    // available to this project, per Program.cs's own comment). Without
    // them, EF Core silently never sees this class as a migration at all -
    // no error, no history row, nothing - so they are required, not
    // decorative.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260823100000_SeedSecurityRole")]
    public partial class SeedSecurityRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "Description", "DisplayOrder", "IsActive", "Name" },
                values: new object[,]
                {
                    { 6, "Confirm physical transfer/receipt of material movements", 6, true, "Security" }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 6);
        }
    }
}
