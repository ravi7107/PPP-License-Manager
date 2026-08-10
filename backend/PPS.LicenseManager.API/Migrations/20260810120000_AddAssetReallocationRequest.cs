using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetReallocationRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AssetReallocationRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AssetId = table.Column<int>(type: "integer", nullable: false),
                    CurrentAssignmentId = table.Column<int>(type: "integer", nullable: true),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    ProposedUserId = table.Column<int>(type: "integer", nullable: false),
                    ProposedSeatId = table.Column<int>(type: "integer", nullable: true),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    AdminDecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    AdminDecidedByUserId = table.Column<int>(type: "integer", nullable: true),
                    AdminDecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    AdminRemarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ItDecision = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Pending"),
                    ItDecidedByUserId = table.Column<int>(type: "integer", nullable: true),
                    ItDecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ItRemarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ResultingAssignmentId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AssetReallocationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_AssetAssignments_CurrentAssignmentId",
                        column: x => x.CurrentAssignmentId,
                        principalTable: "AssetAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_AssetAssignments_ResultingAssignmentId",
                        column: x => x.ResultingAssignmentId,
                        principalTable: "AssetAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_Users_ProposedUserId",
                        column: x => x.ProposedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_Users_AdminDecidedByUserId",
                        column: x => x.AdminDecidedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_Users_ItDecidedByUserId",
                        column: x => x.ItDecidedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AssetReallocationRequests_OfficeSeats_ProposedSeatId",
                        column: x => x.ProposedSeatId,
                        principalTable: "OfficeSeats",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_AssetId",
                table: "AssetReallocationRequests",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_CurrentAssignmentId",
                table: "AssetReallocationRequests",
                column: "CurrentAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_ProposedSeatId",
                table: "AssetReallocationRequests",
                column: "ProposedSeatId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_ProposedUserId",
                table: "AssetReallocationRequests",
                column: "ProposedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_RequestedByUserId",
                table: "AssetReallocationRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_ResultingAssignmentId",
                table: "AssetReallocationRequests",
                column: "ResultingAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_Status",
                table: "AssetReallocationRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_AdminDecidedByUserId",
                table: "AssetReallocationRequests",
                column: "AdminDecidedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AssetReallocationRequests_ItDecidedByUserId",
                table: "AssetReallocationRequests",
                column: "ItDecidedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AssetReallocationRequests");
        }
    }
}
