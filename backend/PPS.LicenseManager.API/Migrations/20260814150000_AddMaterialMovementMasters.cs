using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddMaterialMovementMasters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CurrentLocationId",
                table: "Assets",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "MaterialItemCategories",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialItemCategories", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaterialCostCenters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Code = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialCostCenters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialCostCenters_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "MaterialTransporters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    ContactName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    ContactPhone = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    ContactEmail = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    VehicleDetails = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialTransporters", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "MaterialItems",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    ItemCode = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    ItemName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    CategoryId = table.Column<int>(type: "integer", nullable: false),
                    MaterialType = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Stock"),
                    UnitOfMeasure = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    IsSerialized = table.Column<bool>(type: "boolean", nullable: false, defaultValue: false),
                    Description = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MaterialItems", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MaterialItems_MaterialItemCategories_CategoryId",
                        column: x => x.CategoryId,
                        principalTable: "MaterialItemCategories",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assets_CurrentLocationId",
                table: "Assets",
                column: "CurrentLocationId");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_OfficeLocations_CurrentLocationId",
                table: "Assets",
                column: "CurrentLocationId",
                principalTable: "OfficeLocations",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialItemCategories_Code",
                table: "MaterialItemCategories",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialCostCenters_Code",
                table: "MaterialCostCenters",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialCostCenters_CompanyId",
                table: "MaterialCostCenters",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialItems_ItemCode",
                table: "MaterialItems",
                column: "ItemCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_MaterialItems_CategoryId",
                table: "MaterialItems",
                column: "CategoryId");

            migrationBuilder.CreateIndex(
                name: "IX_MaterialItems_MaterialType",
                table: "MaterialItems",
                column: "MaterialType");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_OfficeLocations_CurrentLocationId",
                table: "Assets");

            migrationBuilder.DropTable(
                name: "MaterialItems");

            migrationBuilder.DropTable(
                name: "MaterialCostCenters");

            migrationBuilder.DropTable(
                name: "MaterialTransporters");

            migrationBuilder.DropTable(
                name: "MaterialItemCategories");

            migrationBuilder.DropIndex(
                name: "IX_Assets_CurrentLocationId",
                table: "Assets");

            migrationBuilder.DropColumn(
                name: "CurrentLocationId",
                table: "Assets");
        }
    }
}
