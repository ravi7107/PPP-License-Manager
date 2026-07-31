using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetTemporaryPool : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssetTemporaryPools",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AssetId = table.Column<int>(type: "integer", nullable: false),
                    CurrentAssignmentId = table.Column<int>(type: "integer", nullable: false),
                    ReleasedByUserId = table.Column<int>(type: "integer", nullable: false),
                    AvailableFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    AvailableUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetTemporaryPools", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetTemporaryPools_AssetAssignments_CurrentAssignmentId",
                        column: x => x.CurrentAssignmentId,
                        principalTable: "AssetAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetTemporaryPools_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetTemporaryPools_Users_ReleasedByUserId",
                        column: x => x.ReleasedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "AssetPoolRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TemporaryPoolId = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    RequestedForUserId = table.Column<int>(type: "integer", nullable: false),
                    RequiredFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequiredUntil = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Purpose = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ApprovedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ApprovedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetPoolRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetPoolRequests_AssetTemporaryPools_TemporaryPoolId",
                        column: x => x.TemporaryPoolId,
                        principalTable: "AssetTemporaryPools",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetPoolRequests_Users_ApprovedByUserId",
                        column: x => x.ApprovedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetPoolRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetPoolRequests_Users_RequestedForUserId",
                        column: x => x.RequestedForUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_ApprovedByUserId",
                table: "AssetPoolRequests",
                column: "ApprovedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_RequestedByUserId",
                table: "AssetPoolRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_RequestedForUserId",
                table: "AssetPoolRequests",
                column: "RequestedForUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_RequiredFrom",
                table: "AssetPoolRequests",
                column: "RequiredFrom");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_Status",
                table: "AssetPoolRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AssetPoolRequests_TemporaryPoolId",
                table: "AssetPoolRequests",
                column: "TemporaryPoolId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetTemporaryPools_AssetId",
                table: "AssetTemporaryPools",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetTemporaryPools_AvailableUntil",
                table: "AssetTemporaryPools",
                column: "AvailableUntil");

            migrationBuilder.CreateIndex(
                name: "IX_AssetTemporaryPools_CurrentAssignmentId",
                table: "AssetTemporaryPools",
                column: "CurrentAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetTemporaryPools_ReleasedByUserId",
                table: "AssetTemporaryPools",
                column: "ReleasedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetTemporaryPools_Status",
                table: "AssetTemporaryPools",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetPoolRequests");

            migrationBuilder.DropTable(
                name: "AssetTemporaryPools");
        }
    }
}
