using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Fixes a real bug found while smoke-testing Phase C: POST /api/Inventory
    // (and category creation) failed with Postgres error 23502 ("null value
    // in column IsActive violates not-null constraint").
    //
    // Root cause: the Phase A migration (20260905120000_AddInventoryModule)
    // created both IsActive columns as `nullable: false` with NO database-
    // level default - matching the group of tables in this project that
    // never configure HasDefaultValue() in ApplicationDbContext.cs either
    // (Vendors, Companies, Departments, Clients, Users, ...). But
    // InventoryCategory/InventoryItem's own model config DOES call
    // .HasDefaultValue(true) on IsActive - matching the OTHER precedent
    // group instead (MaterialItemCategories, MaterialItems,
    // MaterialCostCenters, MaterialTransporters, MaterialApprovalWorkflows,
    // Assets, AssetSoftwares, PurchaseRequisitionContacts,
    // UtilizationMappingProfiles, UtilizationUploadBatches - all confirmed,
    // via a live information_schema query, to carry a real column_default
    // of true). That mismatch is what made EF Core omit IsActive from every
    // INSERT (expecting Postgres to supply it via RETURNING) while Postgres
    // had nothing to supply.
    //
    // Fix: add the missing DB defaults so InventoryCategories/InventoryItems
    // actually match the precedent group their own model config already
    // claims to follow. Nothing else changes - no column type, nullability,
    // or existing data is touched; this only adds a DEFAULT clause that
    // future inserts can fall back on (irrelevant to any existing row,
    // since IsActive is `nullable: false` and every row already has an
    // explicit true/false value).
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260905130000_AddInventoryIsActiveDefaults")]
    public partial class AddInventoryIsActiveDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE \"InventoryCategories\" ALTER COLUMN \"IsActive\" SET DEFAULT true;");
            migrationBuilder.Sql(
                "ALTER TABLE \"InventoryItems\" ALTER COLUMN \"IsActive\" SET DEFAULT true;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                "ALTER TABLE \"InventoryCategories\" ALTER COLUMN \"IsActive\" DROP DEFAULT;");
            migrationBuilder.Sql(
                "ALTER TABLE \"InventoryItems\" ALTER COLUMN \"IsActive\" DROP DEFAULT;");
        }
    }
}
