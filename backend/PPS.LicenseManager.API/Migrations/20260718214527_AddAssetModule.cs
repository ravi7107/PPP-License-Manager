using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAssetModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PurchaseOrderNo",
                table: "LicensePurchases");

            migrationBuilder.RenameColumn(
                name: "VendorName",
                table: "LicensePurchases",
                newName: "PurchaseSource");

            migrationBuilder.AlterColumn<decimal>(
                name: "Cost",
                table: "LicensePurchases",
                type: "numeric(18,2)",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric",
                oldNullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ClientId",
                table: "LicensePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContractNumber",
                table: "LicensePurchases",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Currency",
                table: "LicensePurchases",
                type: "character varying(10)",
                maxLength: 10,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DepartmentId",
                table: "LicensePurchases",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "InvoiceNumber",
                table: "LicensePurchases",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LicenseKey",
                table: "LicensePurchases",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LicenseType",
                table: "LicensePurchases",
                type: "character varying(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PONumber",
                table: "LicensePurchases",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseScope",
                table: "LicensePurchases",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateOnly>(
                name: "SupportExpiryDate",
                table: "LicensePurchases",
                type: "date",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "UpdatedAt",
                table: "LicensePurchases",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Vendor",
                table: "LicensePurchases",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateTable(
                name: "Assets",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    AssetTag = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    AssetName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    AssetType = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Manufacturer = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Model = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    SerialNumber = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    HostName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Processor = table.Column<string>(type: "text", nullable: true),
                    RamGb = table.Column<int>(type: "integer", nullable: true),
                    StorageGb = table.Column<int>(type: "integer", nullable: true),
                    GraphicsCard = table.Column<string>(type: "text", nullable: true),
                    OperatingSystem = table.Column<string>(type: "text", nullable: true),
                    DepartmentId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false, defaultValue: "Available"),
                    IsReadyForAssignment = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    PurchaseDate = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    WarrantyExpiry = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Remarks = table.Column<string>(type: "text", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Assets_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assets_AssetTag",
                table: "Assets",
                column: "AssetTag",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assets_DepartmentId",
                table: "Assets",
                column: "DepartmentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Assets");

            migrationBuilder.DropColumn(
                name: "ClientId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "ContractNumber",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "Currency",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "DepartmentId",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "InvoiceNumber",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "LicenseKey",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "LicenseType",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "PONumber",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "PurchaseScope",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "SupportExpiryDate",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "LicensePurchases");

            migrationBuilder.DropColumn(
                name: "Vendor",
                table: "LicensePurchases");

            migrationBuilder.RenameColumn(
                name: "PurchaseSource",
                table: "LicensePurchases",
                newName: "VendorName");

            migrationBuilder.AlterColumn<decimal>(
                name: "Cost",
                table: "LicensePurchases",
                type: "numeric",
                nullable: true,
                oldClrType: typeof(decimal),
                oldType: "numeric(18,2)",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PurchaseOrderNo",
                table: "LicensePurchases",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);
        }
    }
}
