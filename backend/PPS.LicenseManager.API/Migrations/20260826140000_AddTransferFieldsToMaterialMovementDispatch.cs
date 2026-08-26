using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase 5 (final phase) of the procurement traceability / QR-driven
    // material movement plan (Phases 0-4 - Security role, PR/PO
    // traceability, gate pass QR rendering, conditional IT-asset routing,
    // and auto-generated gate pass on approval - are already deployed).
    // Adds TransferredByUserId/TransferredAt to MaterialMovementDispatch -
    // kept distinct from the existing DispatchedByUserId/DispatchedAt,
    // which since Phase 4 record who/when the gate pass was generated
    // (the final approver), not who physically transferred the goods. See
    // MaterialMovementDispatch.TransferredByUserId's own comment, and
    // MaterialMovementService.TransferAsync for where these are set (the
    // mobile security "Transfer" action - AwaitingTransfer -> Dispatched).
    //
    // Purely additive: both columns are nullable, so every existing
    // dispatch row gets NULL for both automatically - no existing
    // Dispatched/Received movement's data is touched, and nothing here
    // changes what GetRgpTrackingAsync or MarkReturnedAsync already do.
    //
    // Pure schema/DDL (AddColumn/CreateIndex/AddForeignKey) - like
    // 20260823110000_AddPurchaseRequisitionTraceabilityToAssetAndLicensePurchase.cs,
    // this does not need a paired Designer.cs, because none of these
    // operations need to resolve a target EF model to generate their SQL
    // (unlike InsertData/DeleteData - see 20260823100000_SeedSecurityRole.cs's
    // own history for exactly what goes wrong when a data operation is used
    // without one). The [DbContext]/[Migration] attributes below are still
    // required either way, for Database.MigrateAsync() to discover this
    // migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260826140000_AddTransferFieldsToMaterialMovementDispatch")]
    public partial class AddTransferFieldsToMaterialMovementDispatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "TransferredByUserId",
                table: "MaterialMovementDispatches",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "TransferredAt",
                table: "MaterialMovementDispatches",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementDispatches_TransferredByUserId",
                table: "MaterialMovementDispatches",
                column: "TransferredByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_MaterialMovementDispatches_Users_TransferredByUserId",
                table: "MaterialMovementDispatches",
                column: "TransferredByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_MaterialMovementDispatches_Users_TransferredByUserId",
                table: "MaterialMovementDispatches");

            migrationBuilder.DropIndex(
                name: "IX_MaterialMovementDispatches_TransferredByUserId",
                table: "MaterialMovementDispatches");

            migrationBuilder.DropColumn(
                name: "TransferredByUserId",
                table: "MaterialMovementDispatches");

            migrationBuilder.DropColumn(
                name: "TransferredAt",
                table: "MaterialMovementDispatches");
        }
    }
}
