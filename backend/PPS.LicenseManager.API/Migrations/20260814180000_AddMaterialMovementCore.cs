using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialMovementCore : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "MaterialApprovalWorkflows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    MovementType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    MinValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    MaxValue = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    FromCompanyId = table.Column<int>(type: "integer", nullable: true),
                    ToCompanyId = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    Priority = table.Column<int>(type: "integer", nullable: false, defaultValue: 100),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialApprovalWorkflows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialApprovalWorkflows_Companies_FromCompanyId",
                        column: x => x.FromCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialApprovalWorkflows_Companies_ToCompanyId",
                        column: x => x.ToCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovements",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    MovementType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Draft"),
                    FromCompanyId = table.Column<int>(type: "integer", nullable: true),
                    FromLocationId = table.Column<int>(type: "integer", nullable: true),
                    FromDepartmentId = table.Column<int>(type: "integer", nullable: true),
                    FromCostCenterId = table.Column<int>(type: "integer", nullable: true),
                    ToCompanyId = table.Column<int>(type: "integer", nullable: true),
                    ToLocationId = table.Column<int>(type: "integer", nullable: true),
                    ToDepartmentId = table.Column<int>(type: "integer", nullable: true),
                    ToCostCenterId = table.Column<int>(type: "integer", nullable: true),
                    VendorId = table.Column<int>(type: "integer", nullable: true),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    RequestedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpectedReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ApprovalWorkflowId = table.Column<int>(type: "integer", nullable: true),
                    CurrentApprovalStepOrder = table.Column<int>(type: "integer", nullable: true),
                    Purpose = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovements", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Companies_FromCompanyId",
                        column: x => x.FromCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_OfficeLocations_FromLocationId",
                        column: x => x.FromLocationId,
                        principalTable: "OfficeLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Departments_FromDepartmentId",
                        column: x => x.FromDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_MaterialCostCenters_FromCostCenterId",
                        column: x => x.FromCostCenterId,
                        principalTable: "MaterialCostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Companies_ToCompanyId",
                        column: x => x.ToCompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_OfficeLocations_ToLocationId",
                        column: x => x.ToLocationId,
                        principalTable: "OfficeLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Departments_ToDepartmentId",
                        column: x => x.ToDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_MaterialCostCenters_ToCostCenterId",
                        column: x => x.ToCostCenterId,
                        principalTable: "MaterialCostCenters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "Vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovements_MaterialApprovalWorkflows_ApprovalWorkflowId",
                        column: x => x.ApprovalWorkflowId,
                        principalTable: "MaterialApprovalWorkflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialApprovalWorkflowSteps",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WorkflowId = table.Column<int>(type: "integer", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false),
                    ApproverRole = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    ApproverUserId = table.Column<int>(type: "integer", nullable: true),
                    ApproverDepartmentId = table.Column<int>(type: "integer", nullable: true),
                    IsMandatory = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialApprovalWorkflowSteps", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialApprovalWorkflowSteps_MaterialApprovalWorkflows_WorkflowId",
                        column: x => x.WorkflowId,
                        principalTable: "MaterialApprovalWorkflows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialApprovalWorkflowSteps_Users_ApproverUserId",
                        column: x => x.ApproverUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialApprovalWorkflowSteps_Departments_ApproverDepartmentId",
                        column: x => x.ApproverDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    ItemId = table.Column<int>(type: "integer", nullable: false),
                    AssetId = table.Column<int>(type: "integer", nullable: true),
                    Quantity = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    UnitOfMeasure = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    SerialNumbers = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Condition = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementItems_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementItems_MaterialItems_ItemId",
                        column: x => x.ItemId,
                        principalTable: "MaterialItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovementItems_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementApprovals",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    StepOrder = table.Column<int>(type: "integer", nullable: false),
                    ApproverUserId = table.Column<int>(type: "integer", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    ActionedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Comments = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementApprovals", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementApprovals_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementApprovals_Users_ApproverUserId",
                        column: x => x.ApproverUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementDispatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    DispatchedByUserId = table.Column<int>(type: "integer", nullable: false),
                    DispatchedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    TransporterId = table.Column<int>(type: "integer", nullable: true),
                    VehicleNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    GatePassNumber = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    GatePassPdfPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    QrPayload = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementDispatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementDispatches_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementDispatches_Users_DispatchedByUserId",
                        column: x => x.DispatchedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovementDispatches_MaterialTransporters_TransporterId",
                        column: x => x.TransporterId,
                        principalTable: "MaterialTransporters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementReceipts",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    ReceivedByUserId = table.Column<int>(type: "integer", nullable: false),
                    ReceivedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    HasDiscrepancy = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    DiscrepancyNotes = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementReceipts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReceipts_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReceipts_Users_ReceivedByUserId",
                        column: x => x.ReceivedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementReceiptItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ReceiptId = table.Column<int>(type: "integer", nullable: false),
                    MovementItemId = table.Column<int>(type: "integer", nullable: false),
                    QuantityReceived = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Condition = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    DiscrepancyNotes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementReceiptItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReceiptItems_MaterialMovementReceipts_ReceiptId",
                        column: x => x.ReceiptId,
                        principalTable: "MaterialMovementReceipts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReceiptItems_MaterialMovementItems_MovementItemId",
                        column: x => x.MovementItemId,
                        principalTable: "MaterialMovementItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementReturns",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    ReturnedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ReturnedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpectedReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ActualReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementReturns", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReturns_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementReturns_Users_ReturnedByUserId",
                        column: x => x.ReturnedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementAttachments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    FileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StoredPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "integer", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementAttachments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementAttachments_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_MaterialMovementAttachments_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialMovementAuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    MovementId = table.Column<int>(type: "integer", nullable: false),
                    Action = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ActorUserId = table.Column<int>(type: "integer", nullable: true),
                    ActionAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Details = table.Column<string>(type: "text", nullable: true),
                    IpAddress = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialMovementAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialMovementAuditLogs_MaterialMovements_MovementId",
                        column: x => x.MovementId,
                        principalTable: "MaterialMovements",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_MaterialMovementAuditLogs_Users_ActorUserId",
                        column: x => x.ActorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // MaterialApprovalWorkflows
            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_MovementType",
                table: "MaterialApprovalWorkflows",
                column: "MovementType");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_IsActive",
                table: "MaterialApprovalWorkflows",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_Priority",
                table: "MaterialApprovalWorkflows",
                column: "Priority");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_FromCompanyId",
                table: "MaterialApprovalWorkflows",
                column: "FromCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflows_ToCompanyId",
                table: "MaterialApprovalWorkflows",
                column: "ToCompanyId");

            // MaterialMovements
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_MovementNumber",
                table: "MaterialMovements",
                column: "MovementNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_Status",
                table: "MaterialMovements",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_MovementType",
                table: "MaterialMovements",
                column: "MovementType");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_FromCompanyId",
                table: "MaterialMovements",
                column: "FromCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_FromLocationId",
                table: "MaterialMovements",
                column: "FromLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_FromDepartmentId",
                table: "MaterialMovements",
                column: "FromDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_FromCostCenterId",
                table: "MaterialMovements",
                column: "FromCostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_ToCompanyId",
                table: "MaterialMovements",
                column: "ToCompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_ToLocationId",
                table: "MaterialMovements",
                column: "ToLocationId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_ToDepartmentId",
                table: "MaterialMovements",
                column: "ToDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_ToCostCenterId",
                table: "MaterialMovements",
                column: "ToCostCenterId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_VendorId",
                table: "MaterialMovements",
                column: "VendorId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_RequestedByUserId",
                table: "MaterialMovements",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovements_ApprovalWorkflowId",
                table: "MaterialMovements",
                column: "ApprovalWorkflowId");

            // MaterialApprovalWorkflowSteps
            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflowSteps_WorkflowId",
                table: "MaterialApprovalWorkflowSteps",
                column: "WorkflowId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflowSteps_WorkflowId_StepOrder",
                table: "MaterialApprovalWorkflowSteps",
                columns: new[] { "WorkflowId", "StepOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflowSteps_ApproverUserId",
                table: "MaterialApprovalWorkflowSteps",
                column: "ApproverUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialApprovalWorkflowSteps_ApproverDepartmentId",
                table: "MaterialApprovalWorkflowSteps",
                column: "ApproverDepartmentId");

            // MaterialMovementItems
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementItems_MovementId",
                table: "MaterialMovementItems",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementItems_ItemId",
                table: "MaterialMovementItems",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementItems_AssetId",
                table: "MaterialMovementItems",
                column: "AssetId");

            // MaterialMovementApprovals
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementApprovals_MovementId",
                table: "MaterialMovementApprovals",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementApprovals_MovementId_StepOrder",
                table: "MaterialMovementApprovals",
                columns: new[] { "MovementId", "StepOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementApprovals_ApproverUserId",
                table: "MaterialMovementApprovals",
                column: "ApproverUserId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementApprovals_Status",
                table: "MaterialMovementApprovals",
                column: "Status");

            // MaterialMovementDispatches
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementDispatches_MovementId",
                table: "MaterialMovementDispatches",
                column: "MovementId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementDispatches_GatePassNumber",
                table: "MaterialMovementDispatches",
                column: "GatePassNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementDispatches_TransporterId",
                table: "MaterialMovementDispatches",
                column: "TransporterId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementDispatches_DispatchedByUserId",
                table: "MaterialMovementDispatches",
                column: "DispatchedByUserId");

            // MaterialMovementReceipts
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReceipts_MovementId",
                table: "MaterialMovementReceipts",
                column: "MovementId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReceipts_ReceivedByUserId",
                table: "MaterialMovementReceipts",
                column: "ReceivedByUserId");

            // MaterialMovementReceiptItems
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReceiptItems_ReceiptId",
                table: "MaterialMovementReceiptItems",
                column: "ReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReceiptItems_MovementItemId",
                table: "MaterialMovementReceiptItems",
                column: "MovementItemId");

            // MaterialMovementReturns
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReturns_MovementId",
                table: "MaterialMovementReturns",
                column: "MovementId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReturns_Status",
                table: "MaterialMovementReturns",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementReturns_ReturnedByUserId",
                table: "MaterialMovementReturns",
                column: "ReturnedByUserId");

            // MaterialMovementAttachments
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementAttachments_MovementId",
                table: "MaterialMovementAttachments",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementAttachments_UploadedByUserId",
                table: "MaterialMovementAttachments",
                column: "UploadedByUserId");

            // MaterialMovementAuditLogs
            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementAuditLogs_MovementId",
                table: "MaterialMovementAuditLogs",
                column: "MovementId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementAuditLogs_ActionAt",
                table: "MaterialMovementAuditLogs",
                column: "ActionAt");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialMovementAuditLogs_ActorUserId",
                table: "MaterialMovementAuditLogs",
                column: "ActorUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "MaterialMovementAuditLogs");

            migrationBuilder.DropTable(
                name: "MaterialMovementAttachments");

            migrationBuilder.DropTable(
                name: "MaterialMovementReturns");

            migrationBuilder.DropTable(
                name: "MaterialMovementReceiptItems");

            migrationBuilder.DropTable(
                name: "MaterialMovementReceipts");

            migrationBuilder.DropTable(
                name: "MaterialMovementDispatches");

            migrationBuilder.DropTable(
                name: "MaterialMovementApprovals");

            migrationBuilder.DropTable(
                name: "MaterialMovementItems");

            migrationBuilder.DropTable(
                name: "MaterialApprovalWorkflowSteps");

            migrationBuilder.DropTable(
                name: "MaterialMovements");

            migrationBuilder.DropTable(
                name: "MaterialApprovalWorkflows");
        }
    }
}
