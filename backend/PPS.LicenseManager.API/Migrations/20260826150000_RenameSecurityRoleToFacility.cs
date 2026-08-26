using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Renames the "Security" role (Id 6, seeded by
    // 20260823100000_SeedSecurityRole.cs for the QR-driven material
    // movement transfer/receive flow) to "Facility" - the business owner
    // decided, before anyone had actually been assigned the role yet,
    // that "Facility" better matches who does this job in practice
    // (verifying a gate pass QR on the mobile scanner app, tapping
    // Transfer to confirm physical dispatch, and later scanning again at
    // the destination to mark it Received). Everywhere the string
    // "Security" was used as this role's name has been updated alongside
    // this migration - see MaterialMovementController.cs's [Authorize]
    // attributes, MaterialApprovalWorkflowService.AllowedApproverRoles,
    // and frontend/lib/auth/roles.ts.
    //
    // UPDATE, not DELETE+INSERT - this preserves the row's Id (6), so if
    // any user had already been assigned this role (via RoleId = 6) their
    // assignment is completely unaffected; only the displayed/matched
    // Name changes.
    //
    // Raw SQL, matching 20260823100000_SeedSecurityRole.cs's own
    // established reasoning: InsertData/DeleteData/UpdateData resolve
    // against this migration's TargetModel, which is empty without a
    // paired Designer.cs (this project has no dotnet-ef CLI to generate
    // one - see Program.cs's own comment). Raw SQL has no such dependency.
    //
    // Like every other migration in this initiative, the [DbContext]/
    // [Migration] attributes below (not a separate Designer.cs) are what
    // Database.MigrateAsync() actually uses to discover and apply this
    // migration - see DbSeeder.SeedAsync.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260826150000_RenameSecurityRoleToFacility")]
    public partial class RenameSecurityRoleToFacility : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Roles\" SET \"Name\" = 'Facility' " +
                "WHERE \"Id\" = 6 AND \"Name\" = 'Security';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "UPDATE \"Roles\" SET \"Name\" = 'Security' " +
                "WHERE \"Id\" = 6 AND \"Name\" = 'Facility';");
        }
    }
}
