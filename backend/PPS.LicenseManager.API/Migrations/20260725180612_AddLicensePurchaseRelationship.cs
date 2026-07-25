using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddLicensePurchaseRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "LicensePurchaseId",
                table: "Licenses",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Licenses_LicensePurchaseId",
                table: "Licenses",
                column: "LicensePurchaseId");

            migrationBuilder.AddForeignKey(
                name: "FK_Licenses_LicensePurchases_LicensePurchaseId",
                table: "Licenses",
                column: "LicensePurchaseId",
                principalTable: "LicensePurchases",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Licenses_LicensePurchases_LicensePurchaseId",
                table: "Licenses");

            migrationBuilder.DropIndex(
                name: "IX_Licenses_LicensePurchaseId",
                table: "Licenses");

            migrationBuilder.DropColumn(
                name: "LicensePurchaseId",
                table: "Licenses");
        }
    }
}
