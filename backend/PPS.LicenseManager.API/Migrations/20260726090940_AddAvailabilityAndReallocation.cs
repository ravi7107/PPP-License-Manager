using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAvailabilityAndReallocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UserUnavailabilities",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UserId = table.Column<int>(type: "integer", nullable: false),
                    StartDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Reason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Active"),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CancelledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CancelledByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserUnavailabilities", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserUnavailabilities_Users_CancelledByUserId",
                        column: x => x.CancelledByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserUnavailabilities_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UserUnavailabilities_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ResourceReallocationRequests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    RequestReference = table.Column<Guid>(type: "uuid", nullable: false),
                    UserUnavailabilityId = table.Column<int>(type: "integer", nullable: false),
                    ResourceAllocationId = table.Column<int>(type: "integer", nullable: false),
                    TargetUserId = table.Column<int>(type: "integer", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Pending"),
                    Remarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DecidedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    DecidedByUserId = table.Column<int>(type: "integer", nullable: true),
                    DecisionRemarks = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ResultingAllocationId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ResourceReallocationRequests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_ResourceAllocations_ResourceAl~",
                        column: x => x.ResourceAllocationId,
                        principalTable: "ResourceAllocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_ResourceAllocations_ResultingA~",
                        column: x => x.ResultingAllocationId,
                        principalTable: "ResourceAllocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_UserUnavailabilities_UserUnava~",
                        column: x => x.UserUnavailabilityId,
                        principalTable: "UserUnavailabilities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_Users_DecidedByUserId",
                        column: x => x.DecidedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_Users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_ResourceReallocationRequests_Users_TargetUserId",
                        column: x => x.TargetUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_DecidedByUserId",
                table: "ResourceReallocationRequests",
                column: "DecidedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_RequestedByUserId",
                table: "ResourceReallocationRequests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_RequestReference",
                table: "ResourceReallocationRequests",
                column: "RequestReference",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_ResourceAllocationId",
                table: "ResourceReallocationRequests",
                column: "ResourceAllocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_ResultingAllocationId",
                table: "ResourceReallocationRequests",
                column: "ResultingAllocationId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_Status",
                table: "ResourceReallocationRequests",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_TargetUserId",
                table: "ResourceReallocationRequests",
                column: "TargetUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ResourceReallocationRequests_UserUnavailabilityId",
                table: "ResourceReallocationRequests",
                column: "UserUnavailabilityId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUnavailabilities_CancelledByUserId",
                table: "UserUnavailabilities",
                column: "CancelledByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUnavailabilities_CreatedByUserId",
                table: "UserUnavailabilities",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUnavailabilities_Status",
                table: "UserUnavailabilities",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UserUnavailabilities_UserId",
                table: "UserUnavailabilities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_UserUnavailabilities_UserId_StartDate_EndDate",
                table: "UserUnavailabilities",
                columns: new[] { "UserId", "StartDate", "EndDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ResourceReallocationRequests");

            migrationBuilder.DropTable(
                name: "UserUnavailabilities");
        }
    }
}
