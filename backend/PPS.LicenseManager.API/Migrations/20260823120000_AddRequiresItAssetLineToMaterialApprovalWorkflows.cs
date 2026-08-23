using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase 3 of the procurement traceability / QR-driven material
    // movement plan (Phase 0 Security role, Phase 1 PR/PO traceability,
    // and Phase 2 gate pass QR rendering are already deployed). Adds one
    // nullable bool column used to conditionally route IT-asset-carrying
    // movements through a different approval workflow than everything
    // else - see MaterialApprovalWorkflow.RequiresItAssetLine's own
    // comment, and MaterialMovementService.SubmitAsync for where it's
    // evaluated.
    //
    // Every existing row gets NULL for this column automatically, which
    // means "matches regardless" per this entity's own established
    // convention - so no existing workflow's routing behavior changes
    // just from this migration applying. Routing only changes once an
    // admin deliberately creates or edits a workflow to set this field to
    // true/false, as a distinct, later, manual step.
    //
    // Pure schema/DDL (AddColumn/CreateIndex only) - like
    // 20260823110000_AddPurchaseRequisitionTraceabilityToAssetAndLicensePurchase.cs,
    // this does not need a paired Designer.cs, since AddColumn/CreateIndex
    // don't need to resolve a target EF model to generate their SQL
    // (unlike InsertData/DeleteData - see 20260823100000_SeedSecurityRole.cs's
    // own history for exactly what goes wrong when a data operation is
    // used without one). The [DbContext]/[Migration] attributes below are
    // still required either way, for Database.MigrateAsync() to discover
    // this migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260823120000_AddRequiresItAssetLineToMaterialApprovalWorkflows")]
    public partial class AddRequiresItAssetLineToMaterialApprovalWorkflows : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequiresItAssetLine",
                table: "MaterialApprovalWorkflows",
                type: "boolean",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_RequiresItAssetLine",
                table: "MaterialApprovalWorkflows",
                column: "RequiresItAssetLine");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_MaterialApprovalWorkflows_RequiresItAssetLine",
                table: "MaterialApprovalWorkflows");

            migrationBuilder.DropColumn(
                name: "RequiresItAssetLine",
                table: "MaterialApprovalWorkflows");
        }
    }
}
