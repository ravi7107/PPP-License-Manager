using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddOfficeLocationStructure : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OfficeLocations",
                columns: table => new
                {
                    Id = table.Column<int>(
                            type: "integer",
                            nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),

                    CompanyId = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    LocationCode = table.Column<string>(
                        type: "character varying(50)",
                        maxLength: 50,
                        nullable: false),

                    LocationName = table.Column<string>(
                        type: "character varying(150)",
                        maxLength: 150,
                        nullable: false),

                    Address = table.Column<string>(
                        type: "character varying(500)",
                        maxLength: 500,
                        nullable: false),

                    City = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false),

                    State = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false),

                    Country = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false,
                        defaultValue: "India"),

                    IsActive = table.Column<bool>(
                        type: "boolean",
                        nullable: false),

                    CreatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false),

                    UpdatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_OfficeLocations",
                        x => x.Id);

                    table.ForeignKey(
                        name: "FK_OfficeLocations_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OfficeFloors",
                columns: table => new
                {
                    Id = table.Column<int>(
                            type: "integer",
                            nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),

                    OfficeLocationId = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    FloorCode = table.Column<string>(
                        type: "character varying(50)",
                        maxLength: 50,
                        nullable: false),

                    FloorName = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false),

                    SortOrder = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    IsActive = table.Column<bool>(
                        type: "boolean",
                        nullable: false),

                    CreatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false),

                    UpdatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_OfficeFloors",
                        x => x.Id);

                    table.ForeignKey(
                        name: "FK_OfficeFloors_OfficeLocations_OfficeLocationId",
                        column: x => x.OfficeLocationId,
                        principalTable: "OfficeLocations",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "OfficeSeats",
                columns: table => new
                {
                    Id = table.Column<int>(
                            type: "integer",
                            nullable: false)
                        .Annotation(
                            "Npgsql:ValueGenerationStrategy",
                            NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),

                    OfficeFloorId = table.Column<int>(
                        type: "integer",
                        nullable: false),

                    SeatCode = table.Column<string>(
                        type: "character varying(50)",
                        maxLength: 50,
                        nullable: false),

                    SeatName = table.Column<string>(
                        type: "character varying(100)",
                        maxLength: 100,
                        nullable: false),

                    DepartmentId = table.Column<int>(
                        type: "integer",
                        nullable: true),

                    XPosition = table.Column<decimal>(
                        type: "numeric(6,3)",
                        precision: 6,
                        scale: 3,
                        nullable: true),

                    YPosition = table.Column<decimal>(
                        type: "numeric(6,3)",
                        precision: 6,
                        scale: 3,
                        nullable: true),

                    IsActive = table.Column<bool>(
                        type: "boolean",
                        nullable: false),

                    CreatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: false),

                    UpdatedAt = table.Column<DateTime>(
                        type: "timestamp with time zone",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_OfficeSeats",
                        x => x.Id);

                    table.ForeignKey(
                        name: "FK_OfficeSeats_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_OfficeSeats_OfficeFloors_OfficeFloorId",
                        column: x => x.OfficeFloorId,
                        principalTable: "OfficeFloors",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OfficeFloors_OfficeLocationId_FloorCode",
                table: "OfficeFloors",
                columns: new[]
                {
                    "OfficeLocationId",
                    "FloorCode"
                },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OfficeLocations_CompanyId_LocationCode",
                table: "OfficeLocations",
                columns: new[]
                {
                    "CompanyId",
                    "LocationCode"
                },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_OfficeSeats_DepartmentId",
                table: "OfficeSeats",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_OfficeSeats_OfficeFloorId_SeatCode",
                table: "OfficeSeats",
                columns: new[]
                {
                    "OfficeFloorId",
                    "SeatCode"
                },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OfficeSeats");

            migrationBuilder.DropTable(
                name: "OfficeFloors");

            migrationBuilder.DropTable(
                name: "OfficeLocations");
        }
    }
}
