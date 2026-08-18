using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseRequisitionRevisionAndVendorGstin : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Revision tracking on Purchase Requisitions: RevisionNumber
            // defaults to 0 for every existing/new row ("Rev 00" on the
            // PDF and in the UI); PreviousRevisionId is only ever set by
            // CreateRevisionAsync when it clones an Approved PR into a new
            // linked Draft. Both are additive and nullable/defaulted, so
            // every existing row is valid with no backfill.
            migrationBuilder.AddColumn<int>(
                name: "RevisionNumber",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "PreviousRevisionId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_PreviousRevisionId",
                table: "PurchaseRequisitions",
                column: "PreviousRevisionId");

            // Self-referencing FK, Restrict on delete - matches this
            // codebase's existing self-reference precedent
            // (Users.ReportsToUserId). A Draft/InApproval row can still be
            // deleted (DeleteDraftAsync only allows Draft anyway), but an
            // Approved row referenced as someone's PreviousRevisionId
            // can never be deleted through the app in the first place, so
            // Restrict never actually blocks a real deletion here - it's
            // defense-in-depth, same reasoning as the rest of this
            // module's FKs.
            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_PurchaseRequisitions_PreviousRevisionId",
                table: "PurchaseRequisitions",
                column: "PreviousRevisionId",
                principalTable: "PurchaseRequisitions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Vendor GSTIN - optional, shown on the Purchase Requisition
            // PDF's Vendor Information section when set.
            migrationBuilder.AddColumn<string>(
                name: "GSTIN",
                table: "Vendors",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_PurchaseRequisitions_PreviousRevisionId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_PreviousRevisionId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PreviousRevisionId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "RevisionNumber",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "GSTIN",
                table: "Vendors");
        }
    }
}
