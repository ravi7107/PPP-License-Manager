using Microsoft.EntityFrameworkCore.Migrations;

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
