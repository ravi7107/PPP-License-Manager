using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class AddUtilizationAnalyticsModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "UtilizationMappingProfiles",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    VendorSourceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    FileFormat = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false, defaultValue: "Excel"),
                    ColumnMappingsJson = table.Column<string>(type: "jsonb", nullable: false),
                    SoftwareId = table.Column<int>(type: "integer", nullable: true),
                    CreatedByUserId = table.Column<int>(type: "integer", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LastUsedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationMappingProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationMappingProfiles_Software_SoftwareId",
                        column: x => x.SoftwareId,
                        principalTable: "Software",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationMappingProfiles_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UtilizationUploadBatches",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    SoftwareId = table.Column<int>(type: "integer", nullable: true),
                    VendorSourceName = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    MappingProfileId = table.Column<int>(type: "integer", nullable: true),
                    ConfirmedMappingJson = table.Column<string>(type: "jsonb", nullable: true),
                    OriginalFileName = table.Column<string>(type: "character varying(260)", maxLength: 260, nullable: false),
                    StoredPath = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ContentType = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    FileSizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    FileHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    ReportingPeriodStart = table.Column<DateOnly>(type: "date", nullable: false),
                    ReportingPeriodEnd = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false, defaultValue: "Uploaded"),
                    TotalRowCount = table.Column<int>(type: "integer", nullable: false),
                    UsableRowCount = table.Column<int>(type: "integer", nullable: false),
                    WarningRowCount = table.Column<int>(type: "integer", nullable: false),
                    CompanyId = table.Column<int>(type: "integer", nullable: true),
                    DepartmentId = table.Column<int>(type: "integer", nullable: true),
                    UploadedByUserId = table.Column<int>(type: "integer", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationUploadBatches", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadBatches_Software_SoftwareId",
                        column: x => x.SoftwareId,
                        principalTable: "Software",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadBatches_UtilizationMappingProfiles_MappingProfileId",
                        column: x => x.MappingProfileId,
                        principalTable: "UtilizationMappingProfiles",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadBatches_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadBatches_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadBatches_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UtilizationRawRows",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UploadBatchId = table.Column<int>(type: "integer", nullable: false),
                    RowNumber = table.Column<int>(type: "integer", nullable: false),
                    RawDataJson = table.Column<string>(type: "jsonb", nullable: false),
                    RowHash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationRawRows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationRawRows_UtilizationUploadBatches_UploadBatchId",
                        column: x => x.UploadBatchId,
                        principalTable: "UtilizationUploadBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "UtilizationFacts",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UploadBatchId = table.Column<int>(type: "integer", nullable: false),
                    RawRowId = table.Column<long>(type: "bigint", nullable: false),
                    SoftwareId = table.Column<int>(type: "integer", nullable: true),
                    RawSoftwareText = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    MatchedUserId = table.Column<int>(type: "integer", nullable: true),
                    RawUserIdentifier = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    RawUserDisplayName = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    RawDepartmentText = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    MatchedDepartmentId = table.Column<int>(type: "integer", nullable: true),
                    RawLocationText = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    LastUsedDate = table.Column<DateOnly>(type: "date", nullable: true),
                    DaysUsedInPeriod = table.Column<int>(type: "integer", nullable: true),
                    MonthlyAverageUsage = table.Column<decimal>(type: "numeric(10,2)", precision: 10, scale: 2, nullable: true),
                    VersionUsed = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    AssignedFlag = table.Column<bool>(type: "boolean", nullable: true),
                    RawStatusText = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: true),
                    DataQualityFlags = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    IsUsableForCalculation = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationFacts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationFacts_UtilizationUploadBatches_UploadBatchId",
                        column: x => x.UploadBatchId,
                        principalTable: "UtilizationUploadBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UtilizationFacts_UtilizationRawRows_RawRowId",
                        column: x => x.RawRowId,
                        principalTable: "UtilizationRawRows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationFacts_Software_SoftwareId",
                        column: x => x.SoftwareId,
                        principalTable: "Software",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationFacts_Users_MatchedUserId",
                        column: x => x.MatchedUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationFacts_Departments_MatchedDepartmentId",
                        column: x => x.MatchedDepartmentId,
                        principalTable: "Departments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UtilizationTierSettings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    CompanyId = table.Column<int>(type: "integer", nullable: true),
                    HeavyMinPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 60m),
                    RegularMinPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 30m),
                    OccasionalMinPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 10m),
                    LowMinPct = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false, defaultValue: 1m),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedByUserId = table.Column<int>(type: "integer", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationTierSettings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationTierSettings_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "Companies",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationTierSettings_Users_UpdatedByUserId",
                        column: x => x.UpdatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "UtilizationUploadAuditLogs",
                columns: table => new
                {
                    Id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    UploadBatchId = table.Column<int>(type: "integer", nullable: true),
                    Action = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    PerformedByUserId = table.Column<int>(type: "integer", nullable: true),
                    Details = table.Column<string>(type: "text", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UtilizationUploadAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadAuditLogs_UtilizationUploadBatches_UploadBatchId",
                        column: x => x.UploadBatchId,
                        principalTable: "UtilizationUploadBatches",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_UtilizationUploadAuditLogs_Users_PerformedByUserId",
                        column: x => x.PerformedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            // UtilizationMappingProfiles
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationMappingProfiles_VendorSourceName_FileFormat",
                table: "UtilizationMappingProfiles",
                columns: new[] { "VendorSourceName", "FileFormat" });

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationMappingProfiles_SoftwareId",
                table: "UtilizationMappingProfiles",
                column: "SoftwareId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationMappingProfiles_CreatedByUserId",
                table: "UtilizationMappingProfiles",
                column: "CreatedByUserId");

            // UtilizationUploadBatches
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_SoftwareId",
                table: "UtilizationUploadBatches",
                column: "SoftwareId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_MappingProfileId",
                table: "UtilizationUploadBatches",
                column: "MappingProfileId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_CompanyId",
                table: "UtilizationUploadBatches",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_DepartmentId",
                table: "UtilizationUploadBatches",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_UploadedByUserId",
                table: "UtilizationUploadBatches",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_FileHash",
                table: "UtilizationUploadBatches",
                column: "FileHash");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_Status",
                table: "UtilizationUploadBatches",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadBatches_IsActive",
                table: "UtilizationUploadBatches",
                column: "IsActive");

            // UtilizationRawRows
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationRawRows_UploadBatchId",
                table: "UtilizationRawRows",
                column: "UploadBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationRawRows_RowHash",
                table: "UtilizationRawRows",
                column: "RowHash");

            // UtilizationFacts
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_UploadBatchId",
                table: "UtilizationFacts",
                column: "UploadBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_RawRowId",
                table: "UtilizationFacts",
                column: "RawRowId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_SoftwareId",
                table: "UtilizationFacts",
                column: "SoftwareId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_MatchedUserId",
                table: "UtilizationFacts",
                column: "MatchedUserId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_MatchedDepartmentId",
                table: "UtilizationFacts",
                column: "MatchedDepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationFacts_IsUsableForCalculation",
                table: "UtilizationFacts",
                column: "IsUsableForCalculation");

            // UtilizationTierSettings
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationTierSettings_CompanyId",
                table: "UtilizationTierSettings",
                column: "CompanyId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationTierSettings_UpdatedByUserId",
                table: "UtilizationTierSettings",
                column: "UpdatedByUserId");

            // UtilizationUploadAuditLogs
            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadAuditLogs_UploadBatchId",
                table: "UtilizationUploadAuditLogs",
                column: "UploadBatchId");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadAuditLogs_CreatedAt",
                table: "UtilizationUploadAuditLogs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_UtilizationUploadAuditLogs_PerformedByUserId",
                table: "UtilizationUploadAuditLogs",
                column: "PerformedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "UtilizationUploadAuditLogs");
            migrationBuilder.DropTable(name: "UtilizationTierSettings");
            migrationBuilder.DropTable(name: "UtilizationFacts");
            migrationBuilder.DropTable(name: "UtilizationRawRows");
            migrationBuilder.DropTable(name: "UtilizationUploadBatches");
            migrationBuilder.DropTable(name: "UtilizationMappingProfiles");
        }
    }
}
