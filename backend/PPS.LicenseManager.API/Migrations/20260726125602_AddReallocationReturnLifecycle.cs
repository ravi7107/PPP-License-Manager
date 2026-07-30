using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReallocationReturnLifecycle : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ReturnAllocationId",
                table: "ResourceReallocationRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReturnRemarks",
                table: "ResourceReallocationRequests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "ReturnedAt",
                table: "ResourceReallocationRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ReturnedByUserId",
                table: "ResourceReallocationRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_ReturnAllocationId",
                table: "ResourceReallocationRequests",
                column: "ReturnAllocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_ReturnedByUserId",
                table: "ResourceReallocationRequests",
                column: "ReturnedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_ResourceReallocationRequests_ResourceAllocations_ReturnAllo~",
                table: "ResourceReallocationRequests",
                column: "ReturnAllocationId",
                principalTable: "ResourceAllocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_ResourceReallocationRequests_Users_ReturnedByUserId",
                table: "ResourceReallocationRequests",
                column: "ReturnedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ResourceReallocationRequests_ResourceAllocations_ReturnAllo~",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropForeignKey(
                name: "FK_ResourceReallocationRequests_Users_ReturnedByUserId",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropIndex(
                name: "IX_ResourceReallocationRequests_ReturnAllocationId",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropIndex(
                name: "IX_ResourceReallocationRequests_ReturnedByUserId",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropColumn(
                name: "ReturnAllocationId",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropColumn(
                name: "ReturnRemarks",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropColumn(
                name: "ReturnedAt",
                table: "ResourceReallocationRequests");

            migrationBuilder.DropColumn(
                name: "ReturnedByUserId",
                table: "ResourceReallocationRequests");
        }
    }
}
