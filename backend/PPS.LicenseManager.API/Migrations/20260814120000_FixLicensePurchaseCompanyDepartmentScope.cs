using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class FixLicensePurchaseCompanyDepartmentScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // LicensePurchase.CompanyId and .PurchasedByType (Models/LicensePurchase.cs)
            // have been part of the C# model - and of
            // ApplicationDbContextModelSnapshot.cs - for a while, but no
            // migration ever actually added the columns to the database.
            // Every call to GET /LicensePurchase (which the Dashboard page
            // depends on) has been failing ever since with:
            //   42703: column l.CompanyId does not exist
            // DepartmentId's column does already exist (added by
            // AddAssetModule), but its index and foreign key were never
            // added for the same reason. This migration brings the database
            // in line with the model that was already there.
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "LicensePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchasedByType",
                table: "LicensePurchases",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Entity");

            migrationBuilder.CreateIndex(
                name: "IX_LicensePurchases_CompanyId",
                table: "LicensePurchases",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_LicensePurchases_DepartmentId",
                table: "LicensePurchases",
                column: "DepartmentId");

            migrationBuilder.AddForeignKey(
                name: "FK_LicensePurchases_Companies_CompanyId",
                table: "LicensePurchases",
                column: "CompanyId",
                principalTable: "Companies",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LicensePurchases_Departments_DepartmentId",
                table: "LicensePurchases",
                column: "DepartmentId",
                principalTable: "Departments",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_LicensePurchases_Companies_CompanyId",
                table: "LicensePurchases");

            migrationBuilder.DropForeignKey(
                name: "FK_LicensePurchases_Departments_DepartmentId",
                table: "LicensePurchases");

            migrationBuilder.DropIndex(
                name: "IX_LicensePurchases_CompanyId",
                table: "LicensePurchases");

            migrationBuilder.DropIndex(
                name: "IX_LicensePurchases_DepartmentId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "PurchasedByType",
                table: "LicensePurchases");
        }
    }
}
