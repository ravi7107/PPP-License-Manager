using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase 6 of the procurement-audit-trail extension (Phases 0-5 of the
    // original procurement traceability / QR-driven material movement plan
    // are already deployed). Adds PoDate/PoAmount/PoUploadedByEmail to
    // PurchaseRequisition (alongside the existing PoNumber/PoDocumentPath/
    // PoUploadedAt columns - same "unprotected by the immutability
    // trigger" treatment, see PurchaseRequisition.PoDate's own comment)
    // and a new PurchaseRequisitionPoUploads table recording every past PO
    // upload/re-upload, not just the latest.
    //
    // Purely additive: every new PurchaseRequisitions column is nullable,
    // so every existing row gets NULL automatically - no existing PR's
    // data is touched, and nothing here changes what
    // UploadPoByTokenAsync's overwrite-on-reupload behavior already does
    // to the header fields.
    //
    // Pure schema/DDL (AddColumn/CreateTable/CreateIndex/AddForeignKey) -
    // like 20260826140000_AddTransferFieldsToMaterialMovementDispatch.cs,
    // this does not need a paired Designer.cs, because none of these
    // operations need to resolve a target EF model to generate their SQL
    // (unlike InsertData/DeleteData - see 20260823100000_SeedSecurityRole.cs's
    // own history for exactly what goes wrong when a data operation is used
    // without one). CreateTable is schema DDL in the same sense as
    // AddColumn - it takes explicit column/type definitions as direct
    // arguments rather than resolving them from an entity-type mapping -
    // so the same reasoning applies here. The [DbContext]/[Migration]
    // attributes below are still required either way, for
    // Database.MigrateAsync() to discover this migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260828120000_AddPoDateAmountAndUploadHistory")]
    public partial class AddPoDateAmountAndUploadHistory : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "PoDate",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "PoAmount",
                table: "PurchaseRequisitions",
                type: "numeric(18,2)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PoUploadedByEmail",
                table: "PurchaseRequisitions",
                type: "character varying(256)",
                maxLength: 256,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionPoUploads",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    PoNumber = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    PoDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PoAmount = table.Column<decimal>(type: "numeric(18,2)", nullable: true),
                    PoDocumentPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UploadedByEmail = table.Column<string>(type: "character varying(256)", maxLength: 256, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionPoUploads", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionPoUploads_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionPoUploads_PurchaseRequisitionId",
                table: "PurchaseRequisitionPoUploads",
                column: "PurchaseRequisitionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "PurchaseRequisitionPoUploads");

            migrationBuilder.DropColumn(
                name: "PoDate",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoAmount",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoUploadedByEmail",
                table: "PurchaseRequisitions");
        }
    }
}
