using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAllocationRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "AllocationRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RequestReference = table.Column<Guid>(type: "uuid", nullable: false),
                    SoftwareId = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    AssetId = table.Column<int>(type: "integer", nullable: true),
                    BusinessJustification = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    RequiredFrom = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    RequiredTill = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Priority = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_AllocationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_AllocationRequests_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AllocationRequests_Software_SoftwareId",
                        column: x => x.SoftwareId,
                        principalTable: "Software",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_AllocationRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRequests_AssetId",
                table: "AllocationRequests",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRequests_RequestedByUserId",
                table: "AllocationRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRequests_RequestReference",
                table: "AllocationRequests",
                column: "RequestReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRequests_SoftwareId",
                table: "AllocationRequests",
                column: "SoftwareId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "AllocationRequests");
        }
    }
}
