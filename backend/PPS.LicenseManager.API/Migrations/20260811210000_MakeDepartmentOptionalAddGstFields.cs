using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PPS.LicenseManager.API.Migrations
{
    /// <inheritdoc />
    public partial class MakeDepartmentOptionalAddGstFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // The New Purchase Requisition form now collects Entity
            // (Company, already a required column on this table) instead
            // of Department - Department is no longer set on new PRs, but
            // the column/FK stay in place (now optional) so PRs created
            // before this change keep their department on record.
            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.AddColumn<decimal>(
                name: "CgstPercent",
                table: "PurchaseRequisitions",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 9m);

            migrationBuilder.AddColumn<decimal>(
                name: "SgstPercent",
                table: "PurchaseRequisitions",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: false,
                defaultValue: 9m);

            // Extend the Approved-PR immutability guard (see
            // AddPurchaseRequisitionModule's trigger comment) to also
            // cover the two new tax columns - same "financial columns
            // can't change after Approved" intent as the existing
            // SubtotalAmount/TaxAmount/TotalAmount guards.
            migrationBuilder.Sql(@"
CREATE OR REPLACE FUNCTION pr_block_approved_requisition_mutation()
RETURNS trigger AS $BODY$
BEGIN
    IF OLD.""Status"" = 'Approved' THEN
        IF NEW.""Status"" IS DISTINCT FROM OLD.""Status""
            OR NEW.""PrNumber"" IS DISTINCT FROM OLD.""PrNumber""
            OR NEW.""CompanyId"" IS DISTINCT FROM OLD.""CompanyId""
            OR NEW.""DepartmentId"" IS DISTINCT FROM OLD.""DepartmentId""
            OR NEW.""RequestedByUserId"" IS DISTINCT FROM OLD.""RequestedByUserId""
            OR NEW.""Title"" IS DISTINCT FROM OLD.""Title""
            OR NEW.""Justification"" IS DISTINCT FROM OLD.""Justification""
            OR NEW.""Currency"" IS DISTINCT FROM OLD.""Currency""
            OR NEW.""SubtotalAmount"" IS DISTINCT FROM OLD.""SubtotalAmount""
            OR NEW.""CgstPercent"" IS DISTINCT FROM OLD.""CgstPercent""
            OR NEW.""SgstPercent"" IS DISTINCT FROM OLD.""SgstPercent""
            OR NEW.""TaxAmount"" IS DISTINCT FROM OLD.""TaxAmount""
            OR NEW.""TotalAmount"" IS DISTINCT FROM OLD.""TotalAmount""
        THEN
            RAISE EXCEPTION 'PurchaseRequisition % is Approved and cannot be modified', OLD.""Id"";
        END IF;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore the immutability guard function to its pre-GST form.
            migrationBuilder.Sql(@"
CREATE OR REPLACE FUNCTION pr_block_approved_requisition_mutation()
RETURNS trigger AS $BODY$
BEGIN
    IF OLD.""Status"" = 'Approved' THEN
        IF NEW.""Status"" IS DISTINCT FROM OLD.""Status""
            OR NEW.""PrNumber"" IS DISTINCT FROM OLD.""PrNumber""
            OR NEW.""CompanyId"" IS DISTINCT FROM OLD.""CompanyId""
            OR NEW.""DepartmentId"" IS DISTINCT FROM OLD.""DepartmentId""
            OR NEW.""RequestedByUserId"" IS DISTINCT FROM OLD.""RequestedByUserId""
            OR NEW.""Title"" IS DISTINCT FROM OLD.""Title""
            OR NEW.""Justification"" IS DISTINCT FROM OLD.""Justification""
            OR NEW.""Currency"" IS DISTINCT FROM OLD.""Currency""
            OR NEW.""SubtotalAmount"" IS DISTINCT FROM OLD.""SubtotalAmount""
            OR NEW.""TaxAmount"" IS DISTINCT FROM OLD.""TaxAmount""
            OR NEW.""TotalAmount"" IS DISTINCT FROM OLD.""TotalAmount""
        THEN
            RAISE EXCEPTION 'PurchaseRequisition % is Approved and cannot be modified', OLD.""Id"";
        END IF;
    END IF;
    RETURN NEW;
END;
$BODY$ LANGUAGE plpgsql;
");

            migrationBuilder.DropColumn(
                name: "SgstPercent",
                table: "PurchaseRequisitions");

            migrationBuilder.DropColumn(
                name: "CgstPercent",
                table: "PurchaseRequisitions");

            migrationBuilder.AlterColumn<int>(
                name: "DepartmentId",
                table: "PurchaseRequisitions",
                type: "integer",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);
        }
    }
}
