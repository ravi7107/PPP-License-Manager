using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddResourceAllocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ResourceAllocations",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AllocationReference = table.Column<Guid>(type: "uuid", nullable: false),
                    LicenseId = table.Column<int>(type: "integer", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    AssetId = table.Column<int>(type: "integer", nullable: true),
                    AllocatedByUserId = table.Column<int>(type: "integer", nullable: false),
                    AllocatedOn = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpectedReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ActualReturnDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceAllocations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Licenses_LicenseId",
                        column: x => x.LicenseId,
                        principalTable: "Licenses",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Users_AllocatedByUserId",
                        column: x => x.AllocatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceAllocations_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_AllocatedByUserId",
                table: "ResourceAllocations",
                column: "AllocatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_AllocationReference",
                table: "ResourceAllocations",
                column: "AllocationReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_AssetId",
                table: "ResourceAllocations",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_LicenseId",
                table: "ResourceAllocations",
                column: "LicenseId",
                unique: true,
                filter: "\"IsActive\" = true");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceAllocations_UserId",
                table: "ResourceAllocations",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResourceAllocations");
        }
    }
}
