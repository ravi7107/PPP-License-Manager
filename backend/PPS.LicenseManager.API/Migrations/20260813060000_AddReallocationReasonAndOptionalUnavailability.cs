using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReallocationReasonAndOptionalUnavailability : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ResourceReallocationRequest could previously only exist tied
            // to a UserUnavailability period. RequestReason distinguishes
            // "Unavailability" (existing behavior - temporary, tied to a
            // leave period, return-by-date enforced) from
            // "Underutilization" (new - a manual, permanent reallocation
            // with a written justification in Remarks, not tied to any
            // unavailability period). See AvailabilityService for the
            // branching logic.
            migrationBuilder.AddColumn<string>(
                name: "RequestReason",
                table: "ResourceReallocationRequests",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Unavailability");

            // Underutilization requests aren't tied to any unavailability
            // period, so this FK is no longer always populated.
            migrationBuilder.AlterColumn<int>(
                name: "UserUnavailabilityId",
                table: "ResourceReallocationRequests",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "UserUnavailabilityId",
                table: "ResourceReallocationRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "RequestReason",
                table: "ResourceReallocationRequests");
        }
    }
}
