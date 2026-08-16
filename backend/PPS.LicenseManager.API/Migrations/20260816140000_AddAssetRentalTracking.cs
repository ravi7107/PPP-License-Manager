using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetRentalTracking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OwnershipType",
                table: "Assets",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Owned");

            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RentalStartDate",
                table: "Assets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "RentalEndDate",
                table: "Assets",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_VendorId",
                table: "Assets",
                column: "VendorId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Vendors_VendorId",
                table: "Assets",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Vendors_VendorId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_VendorId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "OwnershipType",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "RentalStartDate",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "RentalEndDate",
                table: "Assets");
        }
    }
}
