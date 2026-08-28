using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase 7 of the procurement-audit-trail extension (Phase 6 - PO Date/
    // Amount + PO-upload history - is already deployed). Adds a new
    // PurchaseRequisitionInvoices table: one row per invoice raised
    // against a PR/PO, deliberately 1:many (not more header fields
    // alongside PoNumber/PoDate/PoAmount) since one PO commonly gets
    // invoiced across more than one delivery - see
    // PurchaseRequisitionInvoice.cs's own class comment.
    //
    // Purely additive: a brand-new table, no existing table/column is
    // touched. MaterialMovementReceiptId is a nullable FK (Restrict) - see
    // that field's own comment on why it's optional and why Restrict, not
    // Cascade.
    //
    // Pure schema/DDL (CreateTable) - same reasoning as
    // 20260828120000_AddPoDateAmountAndUploadHistory.cs and
    // 20260826140000_AddTransferFieldsToMaterialMovementDispatch.cs for why
    // this doesn't need a paired Designer.cs. The [DbContext]/[Migration]
    // attributes below are still required either way, for
    // Database.MigrateAsync() to discover this migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260828130000_AddPurchaseRequisitionInvoices")]
    public partial class AddPurchaseRequisitionInvoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionInvoices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    InvoiceNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    InvoiceDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    InvoiceAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    InvoiceDocumentPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "integer", nullable: false),
                    MaterialMovementReceiptId = table.Column<int>(type: "integer", nullable: true),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionInvoices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionInvoices_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionInvoices_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionInvoices_MaterialMovementReceipts_MaterialMovementReceiptId",
                        column: x => x.MaterialMovementReceiptId,
                        principalTable: "MaterialMovementReceipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionInvoices_PurchaseRequisitionId",
                table: "PurchaseRequisitionInvoices",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionInvoices_MaterialMovementReceiptId",
                table: "PurchaseRequisitionInvoices",
                column: "MaterialMovementReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionInvoices_UploadedByUserId",
                table: "PurchaseRequisitionInvoices",
                column: "UploadedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseRequisitionInvoices");
        }
    }
}
