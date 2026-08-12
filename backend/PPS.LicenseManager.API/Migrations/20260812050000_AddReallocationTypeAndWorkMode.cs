using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddReallocationTypeAndWorkMode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Lets a Team Lead's reallocation request cover more than "move
            // this asset to a new user": RequestType distinguishes Reassign
            // (existing behavior), Reseat (same user, new/changed seat),
            // RemoteMode (mark the asset's assignment as WFH, vacating its
            // seat), and ReturnToOffice (revert WFH, optionally into a new
            // seat). See AssetReallocationRequestService for the branching
            // logic once both approvals are in.
            migrationBuilder.AddColumn<string>(
                name: "RequestType",
                table: "AssetReallocationRequests",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Reassign");

            // Reseat/RemoteMode/ReturnToOffice requests don't change who
            // holds the asset, so ProposedUserId no longer applies to them.
            migrationBuilder.AlterColumn<int>(
                name: "ProposedUserId",
                table: "AssetReallocationRequests",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            // Office vs Remote (WFH) - set on the assignment itself so an
            // asset can go remote without churning assignment history (the
            // holder doesn't change, only where they're working from).
            migrationBuilder.AddColumn<string>(
                name: "WorkMode",
                table: "AssetAssignments",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "Office");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "WorkMode",
                table: "AssetAssignments");

            migrationBuilder.AlterColumn<int>(
                name: "ProposedUserId",
                table: "AssetReallocationRequests",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "RequestType",
                table: "AssetReallocationRequests");
        }
    }
}
