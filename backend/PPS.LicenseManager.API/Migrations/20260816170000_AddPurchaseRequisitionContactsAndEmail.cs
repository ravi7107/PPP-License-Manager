using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseRequisitionContactsAndEmail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionContacts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FullName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    ContactType = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Approver"),
                    CompanyId = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionContacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionContacts_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionContacts_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    FinanceNotificationEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionSettings_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // Approval steps can now be assigned to a Contact instead of a
            // User - AssignedApproverUserId becomes nullable, and a new
            // nullable AssignedApproverContactId FK is added. A CHECK
            // constraint below enforces exactly one of the two is set.
            migrationBuilder.AlterColumn<int>(
                name: "AssignedApproverUserId",
                table: "PurchaseRequisitionApprovalSteps",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<int>(
                name: "AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionApprovalSteps_AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps",
                column: "AssignedApproverContactId");

            migrationBuilder.AddForeignKey(
                name: "FK_PRApprovalSteps_PurchaseRequisitionContacts_AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps",
                column: "AssignedApproverContactId",
                principalTable: "PurchaseRequisitionContacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            // Informational "raised on behalf of" contact, plus PO tracking
            // fields (schema-only for now - the upload UI/endpoint is a
            // follow-up; none of these 5 columns are protected by the
            // existing pr_block_approved_requisition_mutation trigger, so
            // they stay writable after Status becomes Approved by design).
            migrationBuilder.AddColumn<int>(
                name: "InitiatedByContactId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PoNumber",
                table: "PurchaseRequisitions",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PoDocumentPath",
                table: "PurchaseRequisitions",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "PoUploadedAt",
                table: "PurchaseRequisitions",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PoUploadedByUserId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_InitiatedByContactId",
                table: "PurchaseRequisitions",
                column: "InitiatedByContactId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_PoUploadedByUserId",
                table: "PurchaseRequisitions",
                column: "PoUploadedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_PurchaseRequisitionContacts_InitiatedByContactId",
                table: "PurchaseRequisitions",
                column: "InitiatedByContactId",
                principalTable: "PurchaseRequisitionContacts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_PurchaseRequisitions_Users_PoUploadedByUserId",
                table: "PurchaseRequisitions",
                column: "PoUploadedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionContacts_CompanyId",
                table: "PurchaseRequisitionContacts",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionContacts_ContactType",
                table: "PurchaseRequisitionContacts",
                column: "ContactType");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionContacts_IsActive",
                table: "PurchaseRequisitionContacts",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionContacts_CreatedByUserId",
                table: "PurchaseRequisitionContacts",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionSettings_UpdatedByUserId",
                table: "PurchaseRequisitionSettings",
                column: "UpdatedByUserId");

            // ------------------------------------------------------------------
            // Exactly one of AssignedApproverUserId / AssignedApproverContactId
            // must be set per approval step - a step is either decided by an
            // authenticated User (POST .../decision) or, exclusively, by
            // whoever holds the emailed token link (POST .../decide-by-token),
            // never both/neither. Same raw-SQL-constraint convention as the
            // immutability trigger above this migration's predecessor.
            // ------------------------------------------------------------------

            migrationBuilder.Sql(@"
ALTER TABLE ""PurchaseRequisitionApprovalSteps""
ADD CONSTRAINT ""CK_PRApprovalStep_ApproverXor""
CHECK (
    (""AssignedApproverUserId"" IS NOT NULL AND ""AssignedApproverContactId"" IS NULL)
    OR
    (""AssignedApproverUserId"" IS NULL AND ""AssignedApproverContactId"" IS NOT NULL)
);
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
ALTER TABLE ""PurchaseRequisitionApprovalSteps""
DROP CONSTRAINT IF EXISTS ""CK_PRApprovalStep_ApproverXor"";
");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_PurchaseRequisitionContacts_InitiatedByContactId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PurchaseRequisitions_Users_PoUploadedByUserId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_InitiatedByContactId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitions_PoUploadedByUserId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "InitiatedByContactId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoNumber",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoDocumentPath",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoUploadedAt",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "PoUploadedByUserId",
                table: "PurchaseRequisitions");

            migrationBuilder.DropForeignKey(
                name: "FK_PRApprovalSteps_PurchaseRequisitionContacts_AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps");

            migrationBuilder.DropIndex(
                name: "IX_PurchaseRequisitionApprovalSteps_AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps");

            migrationBuilder.DropColumn(
                name: "AssignedApproverContactId",
                table: "PurchaseRequisitionApprovalSteps");

            migrationBuilder.AlterColumn<int>(
                name: "AssignedApproverUserId",
                table: "PurchaseRequisitionApprovalSteps",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionSettings");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionContacts");
        }
    }
}
