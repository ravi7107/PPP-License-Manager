using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddWorkstationAssignmentToOfficeSeat : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AssetId",
                table: "OfficeSeats",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "OfficeSeats",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_OfficeSeats_AssetId",
                table: "OfficeSeats",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_OfficeSeats_UserId",
                table: "OfficeSeats",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_OfficeSeats_Assets_AssetId",
                table: "OfficeSeats",
                column: "AssetId",
                principalTable: "Assets",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_OfficeSeats_Users_UserId",
                table: "OfficeSeats",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_OfficeSeats_Assets_AssetId",
                table: "OfficeSeats");

            migrationBuilder.DropForeignKey(
                name: "FK_OfficeSeats_Users_UserId",
                table: "OfficeSeats");

            migrationBuilder.DropIndex(
                name: "IX_OfficeSeats_AssetId",
                table: "OfficeSeats");

            migrationBuilder.DropIndex(
                name: "IX_OfficeSeats_UserId",
                table: "OfficeSeats");

            migrationBuilder.DropColumn(
                name: "AssetId",
                table: "OfficeSeats");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "OfficeSeats");
        }
    }
}
