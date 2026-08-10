using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSeatToAssetAssignment : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SeatId",
                table: "AssetAssignments",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssetAssignments_SeatId",
                table: "AssetAssignments",
                column: "SeatId");

            migrationBuilder.AddForeignKey(
                name: "FK_AssetAssignments_OfficeSeats_SeatId",
                table: "AssetAssignments",
                column: "SeatId",
                principalTable: "OfficeSeats",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AssetAssignments_OfficeSeats_SeatId",
                table: "AssetAssignments");

            migrationBuilder.DropIndex(
                name: "IX_AssetAssignments_SeatId",
                table: "AssetAssignments");

            migrationBuilder.DropColumn(
                name: "SeatId",
                table: "AssetAssignments");
        }
    }
}
