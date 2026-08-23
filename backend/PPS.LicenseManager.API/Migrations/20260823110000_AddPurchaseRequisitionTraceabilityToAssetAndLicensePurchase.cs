using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase 1 of the procurement traceability / QR-driven material
    // movement plan (Phase 0 was the Security role). Adds an OPTIONAL
    // link from Asset/LicensePurchase back to the Purchase Requisition
    // line item they were bought against - see Asset.PurchaseRequisitionId
    // and LicensePurchase.PurchaseRequisitionId's own comments for the
    // full rationale. Purely additive: every column is nullable, no
    // existing row is touched, ad-hoc (non-PR-linked) Assets/
    // LicensePurchases keep working byte-for-byte unchanged.
    //
    // Pure schema/DDL (AddColumn/CreateIndex/AddForeignKey) - like
    // 20260822150000_WidenPurchaseRequisitionLineItemDescription.cs, this
    // does not need a paired Designer.cs, because none of these operations
    // need to resolve a target EF model to generate their SQL (unlike
    // InsertData/DeleteData - see 20260823100000_SeedSecurityRole.cs's own
    // history for exactly what goes wrong when a data operation is used
    // without one). The [DbContext]/[Migration] attributes below are still
    // required either way, for Database.MigrateAsync() to discover this
    // migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260823110000_AddPurchaseRequisitionTraceabilityToAssetAndLicensePurchase")]
    public partial class AddPurchaseRequisitionTraceabilityToAssetAndLicensePurchase : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "PurchaseRequisitionId",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseRequisitionLineItemId",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PurchaseCost",
                table: "Assets",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseRequisitionId",
                table: "LicensePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PurchaseRequisitionLineItemId",
                table: "LicensePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_PurchaseRequisitionId",
                table: "Assets",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_Assets_PurchaseRequisitionLineItemId",
                table: "Assets",
                column: "PurchaseRequisitionLineItemId");

            migrationBuilder.CreateIndex(
                name: "IX_LicensePurchases_PurchaseRequisitionId",
                table: "LicensePurchases",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_LicensePurchases_PurchaseRequisitionLineItemId",
                table: "LicensePurchases",
                column: "PurchaseRequisitionLineItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_PurchaseRequisitions_PurchaseRequisitionId",
                table: "Assets",
                column: "PurchaseRequisitionId",
                principalTable: "PurchaseRequisitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_PurchaseRequisitionLineItems_PurchaseRequisitionLineItemId",
                table: "Assets",
                column: "PurchaseRequisitionLineItemId",
                principalTable: "PurchaseRequisitionLineItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LicensePurchases_PurchaseRequisitions_PurchaseRequisitionId",
                table: "LicensePurchases",
                column: "PurchaseRequisitionId",
                principalTable: "PurchaseRequisitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_LicensePurchases_PurchaseRequisitionLineItems_PurchaseRequisitionLineItemId",
                table: "LicensePurchases",
                column: "PurchaseRequisitionLineItemId",
                principalTable: "PurchaseRequisitionLineItems",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_PurchaseRequisitions_PurchaseRequisitionId",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_Assets_PurchaseRequisitionLineItems_PurchaseRequisitionLineItemId",
                table: "Assets");

            migrationBuilder.DropForeignKey(
                name: "FK_LicensePurchases_PurchaseRequisitions_PurchaseRequisitionId",
                table: "LicensePurchases");

            migrationBuilder.DropForeignKey(
                name: "FK_LicensePurchases_PurchaseRequisitionLineItems_PurchaseRequisitionLineItemId",
                table: "LicensePurchases");

            migrationBuilder.DropIndex(
                name: "IX_Assets_PurchaseRequisitionId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_Assets_PurchaseRequisitionLineItemId",
                table: "Assets");

            migrationBuilder.DropIndex(
                name: "IX_LicensePurchases_PurchaseRequisitionId",
                table: "LicensePurchases");

            migrationBuilder.DropIndex(
                name: "IX_LicensePurchases_PurchaseRequisitionLineItemId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "PurchaseRequisitionId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "PurchaseRequisitionLineItemId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "PurchaseCost",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "PurchaseRequisitionId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "PurchaseRequisitionLineItemId",
                table: "LicensePurchases");
        }
    }
}
