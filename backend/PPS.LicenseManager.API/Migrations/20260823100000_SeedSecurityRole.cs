using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Adds a "Security" role, needed for the QR-driven material movement
    // transfer/receive flow (Security staff confirm physical dispatch/
    // receipt via the mobile scanner app - see MaterialMovementService's
    // upcoming Transfer/Receive endpoints). Id 6 continues on from the 5
    // roles seeded by SeedDefaultRoles.cs (see the Up() method below for
    // why this uses raw SQL instead of that migration's InsertData shape).
    //
    // Like 20260822150000_WidenPurchaseRequisitionLineItemDescription.cs,
    // this skips the separate Designer.cs and puts the [DbContext]/
    // [Migration] attributes directly on this class - that pair is what
    // Database.MigrateAsync() actually uses to discover and apply a
    // migration (see DbSeeder.SeedAsync; there's no dotnet-ef CLI
    // available to this project, per Program.cs's own comment). Without
    // them, EF Core silently never sees this class as a migration at all -
    // no error, no history row, nothing - so they are required, not
    // decorative.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260823100000_SeedSecurityRole")]
    public partial class SeedSecurityRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Raw SQL, not migrationBuilder.InsertData(...), deliberately.
            // InsertData/DeleteData resolve their column mappings against
            // this migration's TargetModel - which, without a paired
            // Designer.cs BuildTargetModel() snapshot (this project has no
            // dotnet-ef CLI to regenerate one, and hand-authoring a full,
            // unverifiable model snapshot for the entire current schema is
            // its own risk), is an EMPTY model. That fails at apply time
            // with "There is no entity type mapped to the table 'Roles'"
            // (confirmed live on the server). Raw SQL has no such
            // dependency - it is emitted exactly as written, matching the
            // real "Roles" table shape (see
            // ApplicationDbContextModelSnapshot.cs's Role entity: Id
            // integer, Description text, DisplayOrder integer, IsActive
            // boolean, Name text).
            migrationBuilder.Sql(
                "INSERT INTO \"Roles\" (\"Id\", \"Description\", \"DisplayOrder\", \"IsActive\", \"Name\") " +
                "VALUES (6, 'Confirm physical transfer/receipt of material movements', 6, TRUE, 'Security');");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DELETE FROM \"Roles\" WHERE \"Id\" = 6;");
        }
    }
}
