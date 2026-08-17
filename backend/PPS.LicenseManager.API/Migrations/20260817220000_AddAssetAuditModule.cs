using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetAuditModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssetAudits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    LocationId = table.Column<int>(type: "integer", nullable: false),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    StartedByUserId = table.Column<int>(type: "integer", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "InProgress"),
                    CompletedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ExpectedCount = table.Column<int>(type: "integer", nullable: false),
                    FoundCount = table.Column<int>(type: "integer", nullable: false),
                    MissingCount = table.Column<int>(type: "integer", nullable: false),
                    UnexpectedCount = table.Column<int>(type: "integer", nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetAudits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetAudits_OfficeLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "OfficeLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetAudits_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetAudits_Users_StartedByUserId",
                        column: x => x.StartedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetAudits_Users_CompletedByUserId",
                        column: x => x.CompletedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AssetAuditItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AssetAuditId = table.Column<int>(type: "integer", nullable: false),
                    AssetId = table.Column<int>(type: "integer", nullable: false),
                    IsExpected = table.Column<bool>(type: "boolean", nullable: false),
                    IsScanned = table.Column<bool>(type: "boolean", nullable: false),
                    ScannedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ScannedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ResultState = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Missing"),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetAuditItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetAuditItems_AssetAudits_AssetAuditId",
                        column: x => x.AssetAuditId,
                        principalTable: "AssetAudits",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_AssetAuditItems_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetAuditItems_Users_ScannedByUserId",
                        column: x => x.ScannedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // AssetAudits
            migrationBuilder.CreateIndex(
                name: "IX_AssetAudits_LocationId",
                table: "AssetAudits",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAudits_DepartmentId",
                table: "AssetAudits",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAudits_StartedByUserId",
                table: "AssetAudits",
                column: "StartedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAudits_CompletedByUserId",
                table: "AssetAudits",
                column: "CompletedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAudits_Status",
                table: "AssetAudits",
                column: "Status");

            // AssetAuditItems
            migrationBuilder.CreateIndex(
                name: "IX_AssetAuditItems_AssetAuditId_AssetId",
                table: "AssetAuditItems",
                columns: new[] { "AssetAuditId", "AssetId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AssetAuditItems_AssetId",
                table: "AssetAuditItems",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAuditItems_ScannedByUserId",
                table: "AssetAuditItems",
                column: "ScannedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetAuditItems_ResultState",
                table: "AssetAuditItems",
                column: "ResultState");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetAuditItems");

            migrationBuilder.DropTable(
                name: "AssetAudits");
        }
    }
}
