using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseRequisitionModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "PurchaseRequisitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PrNumber = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: true),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Justification = table.Column<string>(type: "text", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Draft"),
                    RequiredApprovalStageCount = table.Column<int>(type: "integer", nullable: false),
                    CurrentApprovalStepOrder = table.Column<int>(type: "integer", nullable: true),
                    Currency = table.Column<string>(type: "character varying(3)", maxLength: 3, nullable: false, defaultValue: "INR"),
                    SubtotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TaxAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    TotalAmount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PdfPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    PdfGeneratedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitions_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitions_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitions_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionLineItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    LineNumber = table.Column<int>(type: "integer", nullable: false),
                    ItemDescription = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    Category = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    UnitPrice = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    LineTotal = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionLineItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRLineItems_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    AttachmentType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "VendorQuotation"),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StoredPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "integer", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRAttachments_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionAttachments_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionApprovalSteps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false),
                    AssignedApproverUserId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionApprovalSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRApprovalSteps_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_PRApprovalSteps_Users_AssignedApproverUserId",
                        column: x => x.AssignedApproverUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionApprovalTokens",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionApprovalStepId = table.Column<int>(type: "integer", nullable: false),
                    TokenHash = table.Column<string>(type: "character varying(128)", maxLength: 128, nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ConsumedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionApprovalTokens", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRApprovalTokens_PRApprovalSteps_PRApprovalStepId",
                        column: x => x.PurchaseRequisitionApprovalStepId,
                        principalTable: "PurchaseRequisitionApprovalSteps",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionAuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    PerformedByUserId = table.Column<int>(type: "integer", nullable: true),
                    PerformedVia = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "WebApp"),
                    Details = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRAuditLogs_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionAuditLogs_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "PurchaseRequisitionFinanceNotifications",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: false),
                    SentToEmail = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    SentByUserId = table.Column<int>(type: "integer", nullable: false),
                    SentAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeliveryStatus = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Sent"),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    EmailMessageId = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PurchaseRequisitionFinanceNotifications", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PRFinanceNotifications_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_PurchaseRequisitionFinanceNotifications_Users_SentByUserId",
                        column: x => x.SentByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_PrNumber",
                table: "PurchaseRequisitions",
                column: "PrNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_CompanyId",
                table: "PurchaseRequisitions",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_DepartmentId",
                table: "PurchaseRequisitions",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_RequestedByUserId",
                table: "PurchaseRequisitions",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitions_Status",
                table: "PurchaseRequisitions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PRLineItems_PurchaseRequisitionId",
                table: "PurchaseRequisitionLineItems",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionAttachments_PurchaseRequisitionId",
                table: "PurchaseRequisitionAttachments",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionAttachments_UploadedByUserId",
                table: "PurchaseRequisitionAttachments",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PRApprovalSteps_PurchaseRequisitionId_StepOrder",
                table: "PurchaseRequisitionApprovalSteps",
                columns: new[] { "PurchaseRequisitionId", "StepOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionApprovalSteps_PurchaseRequisitionId",
                table: "PurchaseRequisitionApprovalSteps",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionApprovalSteps_AssignedApproverUserId",
                table: "PurchaseRequisitionApprovalSteps",
                column: "AssignedApproverUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionApprovalSteps_Status",
                table: "PurchaseRequisitionApprovalSteps",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionApprovalTokens_TokenHash",
                table: "PurchaseRequisitionApprovalTokens",
                column: "TokenHash",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_PRApprovalTokens_PRApprovalStepId",
                table: "PurchaseRequisitionApprovalTokens",
                column: "PurchaseRequisitionApprovalStepId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionAuditLogs_PurchaseRequisitionId",
                table: "PurchaseRequisitionAuditLogs",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionAuditLogs_CreatedAt",
                table: "PurchaseRequisitionAuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionAuditLogs_PerformedByUserId",
                table: "PurchaseRequisitionAuditLogs",
                column: "PerformedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_PRFinanceNotifications_PurchaseRequisitionId",
                table: "PurchaseRequisitionFinanceNotifications",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_PurchaseRequisitionFinanceNotifications_SentByUserId",
                table: "PurchaseRequisitionFinanceNotifications",
                column: "SentByUserId");

            // ------------------------------------------------------------------
            // Immutability guard: once a PurchaseRequisition is Approved, its
            // content/financial columns cannot change (PdfPath/PdfGeneratedAt/
            // UpdatedAt remain writable so PDF generation can still complete
            // after approval), and its line items cannot be inserted, updated,
            // or deleted at all. Defense-in-depth alongside the application-
            // level guard in the service layer - "Approved PR cannot be
            // silently modified" is enforced at both layers deliberately.
            // ------------------------------------------------------------------

            migrationBuilder.Sql(@"
CREATE OR REPLACE FUNCTION pr_block_approved_requisition_mutation()
RETURNS trigger AS $BODY$
BEGIN
    IF OLD.""Status"" = 'Approved' THEN
        IF NEW.""Status"" IS DISTINCT FROM OLD.""Status""
            OR NEW.""PrNumber"" IS DISTINCT FROM OLD.""PrNumber""
            OR NEW.""CompanyId"" IS DISTINCT FROM OLD.""CompanyId""
            OR NEW.""DepartmentId"" IS DISTINCT FROM OLD.""DepartmentId""
            OR NEW.""RequestedByUserId"" IS DISTINCT FROM OLD.""RequestedByUserId""
            OR NEW.""Title"" IS DISTINCT FROM OLD.""Title""
            OR NEW.""Justification"" IS DISTINCT FROM OLD.""Justification""
            OR NEW.""Currency"" IS DISTINCT FROM OLD.""Currency""
            OR NEW.""SubtotalAmount"" IS DISTINCT FROM OLD.""SubtotalAmount""
            OR NEW.""TaxAmount"" IS DISTINCT FROM OLD.""TaxAmount""
            OR NEW.""TotalAmount"" IS DISTINCT FROM OLD.""TotalAmount""
        THEN
            RAISE EXCEPTION 'PurchaseRequisition % is Approved and cannot be modified', OLD.""Id"";
        END IF;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_block_approved_requisition_mutation
BEFORE UPDATE ON ""PurchaseRequisitions""
FOR EACH ROW
EXECUTE FUNCTION pr_block_approved_requisition_mutation();

CREATE OR REPLACE FUNCTION pr_block_approved_line_item_mutation()
RETURNS trigger AS $BODY$
DECLARE
    pr_status character varying(20);
    pr_id integer;
BEGIN
    pr_id := COALESCE(NEW.""PurchaseRequisitionId"", OLD.""PurchaseRequisitionId"");

    SELECT ""Status"" INTO pr_status
    FROM ""PurchaseRequisitions""
    WHERE ""Id"" = pr_id;

    IF pr_status = 'Approved' THEN
        RAISE EXCEPTION 'PurchaseRequisition % is Approved; its line items cannot be modified', pr_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pr_block_approved_line_item_mutation
BEFORE INSERT OR UPDATE OR DELETE ON ""PurchaseRequisitionLineItems""
FOR EACH ROW
EXECUTE FUNCTION pr_block_approved_line_item_mutation();
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
DROP TRIGGER IF EXISTS trg_pr_block_approved_line_item_mutation ON ""PurchaseRequisitionLineItems"";
DROP TRIGGER IF EXISTS trg_pr_block_approved_requisition_mutation ON ""PurchaseRequisitions"";
DROP FUNCTION IF EXISTS pr_block_approved_line_item_mutation();
DROP FUNCTION IF EXISTS pr_block_approved_requisition_mutation();
");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionFinanceNotifications");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionAuditLogs");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionApprovalTokens");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionApprovalSteps");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionAttachments");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitionLineItems");

            migrationBuilder.DropTable(
                name: "PurchaseRequisitions");
        }
    }
}
