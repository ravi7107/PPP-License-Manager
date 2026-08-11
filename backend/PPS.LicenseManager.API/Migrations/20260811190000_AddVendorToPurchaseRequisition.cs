using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorToPurchaseRequisition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "VendorId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_VendorId",
                table: "PurchaseRequisitions",
                column: "VendorId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Vendors_VendorId",
                table: "PurchaseRequisitions",
                column: "VendorId",
                principalTable: "Vendors",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Vendors_VendorId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_VendorId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "PurchaseRequisitions");
        }
    }
}
