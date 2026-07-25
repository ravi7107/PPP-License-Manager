using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAllocationRequestApproval : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "ApprovedAt",
                table: "AllocationRequests",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ApprovedByUserId",
                table: "AllocationRequests",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "AllocationRequests",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AllocationRequests_ApprovedByUserId",
                table: "AllocationRequests",
                column: "ApprovedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_AllocationRequests_Users_ApprovedByUserId",
                table: "AllocationRequests",
                column: "ApprovedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_AllocationRequests_Users_ApprovedByUserId",
                table: "AllocationRequests");

            migrationBuilder.DropIndex(
                name: "IX_AllocationRequests_ApprovedByUserId",
                table: "AllocationRequests");

            migrationBuilder.DropColumn(
                name: "ApprovedAt",
                table: "AllocationRequests");

            migrationBuilder.DropColumn(
                name: "ApprovedByUserId",
                table: "AllocationRequests");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "AllocationRequests");
        }
    }
}
