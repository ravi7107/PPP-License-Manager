using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;
using PPS.LicenseManager.API.Data;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    // Phase A of the new generic, multi-department Inventory module (see
    // InventoryItem.cs / InventoryCategory.cs's own class comments for the
    // full design). Adds two brand-new tables - InventoryCategories and
    // InventoryItems - and seeds a starting set of categories. Purely
    // additive: no existing table/column is touched, and neither new
    // table has any inbound foreign key from any existing table - only
    // InventoryItems itself points OUT to Companies/Departments/
    // OfficeLocations/Assets/PurchaseRequisitions/
    // PurchaseRequisitionLineItems/Vendors, all Restrict, all optional
    // except CategoryId/CompanyId.
    //
    // Pure schema/DDL (CreateTable) for InventoryCategories/InventoryItems,
    // plus a raw-SQL seed for the starting categories - same reasoning as
    // 20260823100000_SeedSecurityRole.cs for why this is raw SQL and not
    // migrationBuilder.InsertData(...): InsertData resolves column
    // mappings against this migration's TargetModel, which is empty
    // without a paired Designer.cs (no dotnet-ef CLI available to this
    // project - see that migration's own comment for the full
    // explanation). Raw SQL has no such dependency. The [DbContext]/
    // [Migration] attributes below are still required either way, for
    // Database.MigrateAsync() to discover this migration at all.
    [DbContext(typeof(ApplicationDbContext))]
    [Migration("20260905120000_AddInventoryModule")]
    public partial class AddInventoryModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "InventoryCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryCategories", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryCategories_Code",
                table: "InventoryCategories",
                column: "Code",
                unique: true);

            migrationBuilder.CreateTable(
                name: "InventoryItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    InventoryTag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    SerialNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: false),
                    LocationId = table.Column<int>(type: "integer", nullable: true),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    AssetId = table.Column<int>(type: "integer", nullable: true),
                    PurchaseRequisitionId = table.Column<int>(type: "integer", nullable: true),
                    PurchaseRequisitionLineItemId = table.Column<int>(type: "integer", nullable: true),
                    PurchaseCost = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: true),
                    VendorId = table.Column<int>(type: "integer", nullable: true),
                    Remarks = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_InventoryItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_InventoryItems_InventoryCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "InventoryCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_OfficeLocations_LocationId",
                        column: x => x.LocationId,
                        principalTable: "OfficeLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Assets_AssetId",
                        column: x => x.AssetId,
                        principalTable: "Assets",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_PurchaseRequisitions_PurchaseRequisitionId",
                        column: x => x.PurchaseRequisitionId,
                        principalTable: "PurchaseRequisitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_PurchaseRequisitionLineItems_PurchaseRequisitionLineItemId",
                        column: x => x.PurchaseRequisitionLineItemId,
                        principalTable: "PurchaseRequisitionLineItems",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_InventoryItems_Vendors_VendorId",
                        column: x => x.VendorId,
                        principalTable: "Vendors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_InventoryTag",
                table: "InventoryItems",
                column: "InventoryTag",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CategoryId",
                table: "InventoryItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_CompanyId",
                table: "InventoryItems",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_LocationId",
                table: "InventoryItems",
                column: "LocationId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_DepartmentId",
                table: "InventoryItems",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_AssetId",
                table: "InventoryItems",
                column: "AssetId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_PurchaseRequisitionId",
                table: "InventoryItems",
                column: "PurchaseRequisitionId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_PurchaseRequisitionLineItemId",
                table: "InventoryItems",
                column: "PurchaseRequisitionLineItemId");

            migrationBuilder.CreateIndex(
                name: "IX_InventoryItems_VendorId",
                table: "InventoryItems",
                column: "VendorId");

            // Starting taxonomy - admin-extensible afterward via
            // POST /api/Inventory/categories, same as Vendor/Department
            // rows are already managed today. Raw SQL, see this
            // migration's own class comment for why (no InsertData).
            migrationBuilder.Sql(@"
                INSERT INTO ""InventoryCategories"" (""Code"", ""Name"", ""Description"", ""IsActive"", ""CreatedAt"")
                VALUES
                    ('IT', 'IT Equipment', 'Computers, peripherals, and other IT hardware - typically also tracked as an Asset.', true, NOW()),
                    ('FACILITY', 'Facility', 'Furniture, fixtures, generators, and other facility equipment.', true, NOW()),
                    ('HR', 'HR', 'HR department equipment and supplies.', true, NOW()),
                    ('OTHER', 'Other', 'Anything not covered by the categories above.', true, NOW());
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "InventoryItems");

            migrationBuilder.DropTable(
                name: "InventoryCategories");
        }
    }
}
