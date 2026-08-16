using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a single Material Movement's Gate Pass - header (movement
 * number/type/status), From/To summary, the item table (with linked
 * asset tag where set), the approval trail, and dispatch details
 * (transporter/vehicle/gate pass number) - as a PDF via QuestPDF's fluent
 * API. Structurally cloned from PurchaseRequisitionPdfDocument.cs.
 *
 * Generated on Dispatch (see MaterialMovementService.
 * GenerateAndStoreGatePassPdfAsync) and lazily (re)generated on download
 * if missing (see GetGatePassPdfFileAsync), stored outside wwwroot so
 * it's reachable only through the authenticated
 * GET /api/MaterialMovement/{id}/gate-pass-pdf endpoint.
 *
 * No QR code - there's no QR-generation library referenced in this
 * project's .csproj, and a new NuGet package can't be compile-verified
 * without a dotnet CLI in the deploy sandbox this session works in. The
 * Gate Pass number itself (printed large, and used as the PDF's file
 * name) is the verification handle for now; a scannable QR is a clean
 * follow-up once a package addition can be tested properly.
 *
 * The caller is responsible for loading every navigation this class
 * reads (From/To Company/Location, Vendor, RequestedByUser, Items with
 * Item/Asset, Approvals with ApproverUser, plus the separately-loaded
 * MaterialMovementDispatch with DispatchedByUser/Transporter) - see
 * MaterialMovementService.GenerateAndStoreGatePassPdfAsync, which already
 * includes all of them.
 */
public class MaterialMovementGatePassPdfDocument : IDocument
{
    private readonly Models.MaterialMovement _movement;
    private readonly Models.MaterialMovementDispatch _dispatch;

    public MaterialMovementGatePassPdfDocument(
        Models.MaterialMovement movement,
        Models.MaterialMovementDispatch dispatch)
    {
        _movement = movement;
        _dispatch = dispatch;
    }

    public void Compose(IDocumentContainer container)
    {
        container.Page(page =>
        {
            page.Size(PageSizes.A4);
            page.Margin(2, Unit.Centimetre);
            page.DefaultTextStyle(x => x.FontSize(10));

            page.Header().Element(ComposeHeader);
            page.Content().Element(ComposeContent);

            page.Footer().AlignCenter().Text(text =>
            {
                text.Span("Page ");
                text.CurrentPageNumber();
                text.Span(" of ");
                text.TotalPages();
            });
        });
    }

    private void ComposeHeader(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("PPS License Manager").FontSize(12).Bold();
                    c.Item().Text("Material Movement Gate Pass")
                        .FontSize(10).FontColor(Colors.Grey.Darken2);
                });

                row.ConstantItem(200).AlignRight().Column(statusColumn =>
                {
                    statusColumn.Item().AlignRight()
                        .Text(_dispatch.GatePassNumber ?? $"Movement #{_movement.Id}")
                        .FontSize(14).Bold();

                    statusColumn.Item().AlignRight()
                        .Text(_movement.MovementNumber ?? $"#{_movement.Id}")
                        .FontSize(10).FontColor(Colors.Grey.Darken1);

                    statusColumn.Item().AlignRight().PaddingTop(4)
                        .Text(_movement.Status)
                        .FontSize(11).Bold()
                        .FontColor(Colors.Green.Darken2);
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingVertical(15).Column(column =>
        {
            column.Spacing(12);

            column.Item().Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Movement Type").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.MovementType).Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Requested By").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.RequestedByUser?.FullName ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Dispatched By").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_dispatch.DispatchedByUser?.FullName ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Dispatched On").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_dispatch.DispatchedAt.ToString("d MMM yyyy")).Bold();
                });
            });

            column.Item().Element(ComposeFromToSummary);

            if (_dispatch.TransporterId.HasValue || !string.IsNullOrWhiteSpace(_dispatch.VehicleNumber))
            {
                column.Item().Element(ComposeDispatchDetails);
            }

            if (!string.IsNullOrWhiteSpace(_movement.Purpose))
            {
                column.Item().Column(c =>
                {
                    c.Item().Text("Purpose").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.Purpose);
                });
            }

            column.Item().Element(ComposeItemsTable);
            column.Item().Element(ComposeApprovalHistoryTable);
        });
    }

    private void ComposeFromToSummary(IContainer container)
    {
        container.Background(Colors.Grey.Lighten4).Padding(8).Row(row =>
        {
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("From").FontSize(9).FontColor(Colors.Grey.Darken1);
                c.Item().Text(FormatLocation(
                    _movement.FromCompany?.Name, _movement.FromLocation?.LocationName)).Bold();
            });

            row.RelativeItem().Column(c =>
            {
                c.Item().Text("To").FontSize(9).FontColor(Colors.Grey.Darken1);
                c.Item().Text(FormatLocation(
                    _movement.ToCompany?.Name, _movement.ToLocation?.LocationName)).Bold();
            });

            if (_movement.Vendor != null)
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Vendor").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.Vendor.VendorName).Bold();
                });
            }
        });
    }

    private static string FormatLocation(string? companyName, string? locationName)
    {
        if (string.IsNullOrWhiteSpace(companyName) && string.IsNullOrWhiteSpace(locationName))
            return "-";

        return string.IsNullOrWhiteSpace(locationName)
            ? companyName!
            : string.IsNullOrWhiteSpace(companyName)
                ? locationName!
                : $"{locationName}, {companyName}";
    }

    private void ComposeDispatchDetails(IContainer container)
    {
        container.Row(row =>
        {
            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Transporter").FontSize(9).FontColor(Colors.Grey.Darken1);
                c.Item().Text(_dispatch.Transporter?.Name ?? "-").Bold();
            });

            row.RelativeItem().Column(c =>
            {
                c.Item().Text("Vehicle Number").FontSize(9).FontColor(Colors.Grey.Darken1);
                c.Item().Text(_dispatch.VehicleNumber ?? "-").Bold();
            });
        });
    }

    private void ComposeItemsTable(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Items").FontSize(11).Bold();

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(25);
                    columns.RelativeColumn(2.5f);
                    columns.RelativeColumn(1.5f);
                    columns.RelativeColumn(0.8f);
                    columns.RelativeColumn(1.5f);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCellStyle).Text("#");
                    header.Cell().Element(HeaderCellStyle).Text("Item");
                    header.Cell().Element(HeaderCellStyle).Text("Asset / Serial");
                    header.Cell().Element(HeaderCellStyle).AlignRight().Text("Qty");
                    header.Cell().Element(HeaderCellStyle).Text("Condition");

                    static IContainer HeaderCellStyle(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold())
                            .PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Black);
                });

                var lineNumber = 1;

                foreach (var line in _movement.Items)
                {
                    table.Cell().Element(BodyCellStyle).Text(lineNumber.ToString());
                    table.Cell().Element(BodyCellStyle)
                        .Text($"{line.Item.ItemName} ({line.Item.ItemCode})");
                    table.Cell().Element(BodyCellStyle)
                        .Text(line.Asset != null
                            ? line.Asset.AssetTag
                            : line.SerialNumbers ?? "-");
                    table.Cell().Element(BodyCellStyle).AlignRight()
                        .Text($"{line.Quantity:0.##}");
                    table.Cell().Element(BodyCellStyle).Text(line.Condition ?? "-");

                    lineNumber++;

                    static IContainer BodyCellStyle(IContainer c) =>
                        c.PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Grey.Lighten2);
                }
            });
        });
    }

    private void ComposeApprovalHistoryTable(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Approval History").FontSize(11).Bold();

            column.Item().Table(table =>
            {
                table.ColumnsDefinition(columns =>
                {
                    columns.ConstantColumn(50);
                    columns.RelativeColumn(2);
                    columns.RelativeColumn();
                    columns.RelativeColumn();
                    columns.RelativeColumn(2);
                });

                table.Header(header =>
                {
                    header.Cell().Element(HeaderCellStyle).Text("Stage");
                    header.Cell().Element(HeaderCellStyle).Text("Approver");
                    header.Cell().Element(HeaderCellStyle).Text("Status");
                    header.Cell().Element(HeaderCellStyle).Text("Decided");
                    header.Cell().Element(HeaderCellStyle).Text("Comments");

                    static IContainer HeaderCellStyle(IContainer c) =>
                        c.DefaultTextStyle(x => x.SemiBold())
                            .PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Black);
                });

                foreach (var approval in _movement.Approvals.OrderBy(a => a.StepOrder))
                {
                    table.Cell().Element(BodyCellStyle).Text(approval.StepOrder.ToString());
                    table.Cell().Element(BodyCellStyle).Text(approval.ApproverUser?.FullName ?? "-");
                    table.Cell().Element(BodyCellStyle).Text(approval.Status);
                    table.Cell().Element(BodyCellStyle).Text(approval.ActionedAt.HasValue
                        ? approval.ActionedAt.Value.ToString("d MMM yyyy")
                        : "-");
                    table.Cell().Element(BodyCellStyle).Text(approval.Comments ?? "-");

                    static IContainer BodyCellStyle(IContainer c) =>
                        c.PaddingVertical(4)
                            .BorderBottom(1)
                            .BorderColor(Colors.Grey.Lighten2);
                }
            });
        });
    }
}
