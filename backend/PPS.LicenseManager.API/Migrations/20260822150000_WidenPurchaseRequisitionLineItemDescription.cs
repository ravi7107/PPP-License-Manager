using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    // NOTE: every other hand-authored migration in this project ships as a
    // paired {Name}.cs + {Name}.Designer.cs (the latter carrying the full
    // ApplicationDbContextModelSnapshot-style BuildTargetModel for that
    // point in history, per dotnet-ef's usual scaffolding convention). This
    // migration deliberately skips the separate Designer.cs and puts both
    // [DbContext]/[Migration] attributes directly on this class instead -
    // that's all Database.MigrateAsync() (see DbSeeder.SeedAsync, the only
    // place this app runs migrations - there's no dotnet-ef CLI available
    // to this project, per Program.cs's own comment) actually needs to
    // discover and apply a migration's Up()/Down(). A full duplicate
    // snapshot isn't needed to make a single column wider, and the
    // PendingModelChangesWarning that BuildTargetModel normally feeds is
    // already suppressed in Program.cs's AddDbContext call. The single
    // source of truth for the CURRENT model shape stays
    // ApplicationDbContextModelSnapshot.cs, updated alongside this file.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260822150000_WidenPurchaseRequisitionLineItemDescription")]
    public partial class WidenPurchaseRequisitionLineItemDescription : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 300 chars was too tight for real item descriptions (users
            // were hitting a silent 400 on save once they typed past it -
            // see PurchaseRequisitionLineItemRequest's [MaxLength]). Widen
            // to 1000, matching the model/DTO change in this same commit.
            // Existing rows are untouched - ALTER COLUMN TYPE to a wider
            // varchar is a metadata-only change in Postgres, no rewrite,
            // no data loss, and every existing value is well under both
            // the old and new limit.
            migrationBuilder.AlterColumn<string>(
                name: "ItemDescription",
                table: "PurchaseRequisitionLineItems",
                type: "character varying(1000)",
                maxLength: 1000,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(300)",
                oldMaxLength: 300);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reversible only if no row has grown past 300 chars since Up()
            // ran - matches this project's other Down() methods, which
            // don't defensively truncate data either.
            migrationBuilder.AlterColumn<string>(
                name: "ItemDescription",
                table: "PurchaseRequisitionLineItems",
                type: "character varying(300)",
                maxLength: 300,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(1000)",
                oldMaxLength: 1000);
        }
    }
}
