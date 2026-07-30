using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficeFloorMap : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "MapContentType",
                table: "OfficeFloors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MapHeight",
                table: "OfficeFloors",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapImagePath",
                table: "OfficeFloors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MapOriginalFileName",
                table: "OfficeFloors",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MapWidth",
                table: "OfficeFloors",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MapContentType",
                table: "OfficeFloors");

            migrationBuilder.DropColumn(
                name: "MapHeight",
                table: "OfficeFloors");

            migrationBuilder.DropColumn(
                name: "MapImagePath",
                table: "OfficeFloors");

            migrationBuilder.DropColumn(
                name: "MapOriginalFileName",
                table: "OfficeFloors");

            migrationBuilder.DropColumn(
                name: "MapWidth",
                table: "OfficeFloors");
        }
    }
}
