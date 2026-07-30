using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserReportingRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReportsToUserId",
                table: "Users",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Users_ReportsToUserId",
                table: "Users",
                column: "ReportsToUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Users_Users_ReportsToUserId",
                table: "Users",
                column: "ReportsToUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Users_Users_ReportsToUserId",
                table: "Users");

            migrationBuilder.DropIndex(
                name: "IX_Users_ReportsToUserId",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "ReportsToUserId",
                table: "Users");
        }
    }
}
