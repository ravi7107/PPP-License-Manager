using System.Reflection;
using QuestPDF.Fluent;
using QuestPDF.Helpers;
using QuestPDF.Infrastructure;

namespace PPS.LicenseManager.API.Services;

/*
 * Renders a single Material Movement's Gate Pass as a PDF via QuestPDF's
 * fluent API. Structurally cloned from PurchaseRequisitionPdfDocument.cs
 * (including its embedded-logo convention), then redesigned into a fixed
 * controlled-document layout, top to bottom:
 *
 *   1. Company branding + legal entity/address - letterhead logo plus the
 *      movement's From (or To, if no From) Company's name/address/GSTIN,
 *      pulled straight from Company.cs (no new fields/migration needed).
 *   2. Gate Pass identity - Gate Pass #, Movement #, Status, dispatch date.
 *   3. Movement details - type, requested by, dispatched by/on, From/To,
 *      purpose.
 *   4. Asset/material details - the item table.
 *   5. Transporter - always shown now (used to be conditional), "-" when
 *      not set, since it's a fixed section of the printed pass.
 *   6. Approval history.
 *   7. QR verification - deliberately NOT a real scannable QR code yet;
 *      per the confirmed v1 decision, adding a QR-generation NuGet
 *      package carries real risk of a build break that can't be
 *      compile-verified in the deploy sandbox this session works in (no
 *      dotnet CLI here - see this class's git history for the same
 *      reasoning, and the QuestPDF using-directive hotfix that already
 *      happened once this session). Reserves a clearly labeled
 *      placeholder box with the Gate Pass Number as the manual
 *      verification handle, ready to swap in a real QR image later.
 *   8. Security gate verification - a printed sign-off block only (blank
 *      lines for the security guard's name/signature/date-time at the
 *      physical gate). No new digital workflow step or database field,
 *      per the confirmed v1 scope - this is pure print layout.
 *   9. Return tracking - read-only display of MaterialMovement.
 *      ExpectedReturnDate plus MaterialMovementReturn if a row exists.
 *      Only MovementType == "TemporaryMovement" ever has anything here -
 *      nothing writes MaterialMovementReturn rows yet (that's still
 *      later-phase work per that model's own comment), so every other
 *      movement type prints "Not applicable" instead of blank fields.
 *  10. Controlled-document footer - reproduction/alteration notice, Gate
 *      Pass number, generation timestamp, and page numbers.
 *
 * Generated on Dispatch (see MaterialMovementService.
 * GenerateAndStoreGatePassPdfAsync) and lazily (re)generated on download
 * if missing (see GetGatePassPdfFileAsync), stored outside wwwroot so
 * it's reachable only through the authenticated
 * GET /api/MaterialMovement/{id}/gate-pass-pdf endpoint.
 *
 * The caller is responsible for loading every navigation this class
 * reads (From/To Company/Location, Vendor, RequestedByUser, Items with
 * Item/Asset, Approvals with ApproverUser, the separately-loaded
 * MaterialMovementDispatch with DispatchedByUser/Transporter, and the
 * separately-loaded MaterialMovementReturn with ReturnedByUser if one
 * exists) - see MaterialMovementService.GenerateAndStoreGatePassPdfAsync,
 * which already includes all of them.
 */
public class MaterialMovementGatePassPdfDocument : IDocument
{
    private readonly Models.MaterialMovement _movement;
    private readonly Models.MaterialMovementDispatch _dispatch;
    private readonly Models.MaterialMovementReturn? _returnRecord;

    // Letterhead logo - same embedded-assembly-resource convention as
    // PurchaseRequisitionPdfDocument.LogoBytes, so this doesn't depend on
    // wwwroot or a volume mount being present.
    private static readonly byte[] LogoBytes = LoadLogoBytes();

    private static byte[] LoadLogoBytes()
    {
        var assembly = typeof(MaterialMovementGatePassPdfDocument).Assembly;
        const string resourceName = "PPS.LicenseManager.API.Assets.pps-logo.jpg";

        using var stream = assembly.GetManifestResourceStream(resourceName)
            ?? throw new InvalidOperationException(
                $"Embedded resource '{resourceName}' not found - check the " +
                "EmbeddedResource entry in PPS.LicenseManager.API.csproj.");

        using var memoryStream = new MemoryStream();
        stream.CopyTo(memoryStream);
        return memoryStream.ToArray();
    }

    public MaterialMovementGatePassPdfDocument(
        Models.MaterialMovement movement,
        Models.MaterialMovementDispatch dispatch,
        Models.MaterialMovementReturn? returnRecord)
    {
        _movement = movement;
        _dispatch = dispatch;
        _returnRecord = returnRecord;
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
            page.Footer().Element(ComposeFooter);
        });
    }

    // 1. Company branding + legal entity/address, 2. Gate Pass identity.
    private void ComposeHeader(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Row(row =>
            {
                row.ConstantItem(140).Height(45)
                    .Image(LogoBytes).FitArea();

                row.RelativeItem().PaddingLeft(10).Column(c =>
                {
                    var entity = _movement.FromCompany ?? _movement.ToCompany;

                    c.Item().Text("Material Gate Pass")
                        .FontSize(9).FontColor(Colors.Grey.Darken1);

                    if (entity != null)
                    {
                        c.Item().PaddingTop(2)
                            .Text(entity.Name).FontSize(12).Bold();

                        if (!string.IsNullOrWhiteSpace(entity.Address))
                        {
                            c.Item().Text(entity.Address)
                                .FontSize(8).FontColor(Colors.Grey.Darken2);
                        }

                        var registrationParts = new List<string>();

                        if (!string.IsNullOrWhiteSpace(entity.GSTNumber))
                            registrationParts.Add($"GSTIN: {entity.GSTNumber}");

                        if (!string.IsNullOrWhiteSpace(entity.Code))
                            registrationParts.Add($"Entity Code: {entity.Code}");

                        if (registrationParts.Count > 0)
                        {
                            c.Item().PaddingTop(1)
                                .Text(string.Join("   ", registrationParts))
                                .FontSize(8).FontColor(Colors.Grey.Darken2);
                        }
                    }
                    else
                    {
                        c.Item().PaddingTop(2)
                            .Text("PPS SmartAsset").FontSize(12).Bold();
                    }
                });

                row.ConstantItem(170).AlignRight().Column(statusColumn =>
                {
                    statusColumn.Item().AlignRight()
                        .Text(_dispatch.GatePassNumber ?? $"Movement #{_movement.Id}")
                        .FontSize(15).Bold();

                    statusColumn.Item().AlignRight()
                        .Text(_movement.MovementNumber ?? $"#{_movement.Id}")
                        .FontSize(10).FontColor(Colors.Grey.Darken1);

                    statusColumn.Item().AlignRight().PaddingTop(4)
                        .Text(_movement.Status)
                        .FontSize(11).Bold()
                        .FontColor(Colors.Green.Darken2);

                    statusColumn.Item().AlignRight().PaddingTop(2)
                        .Text($"Dispatched {_dispatch.DispatchedAt:d MMM yyyy}")
                        .FontSize(8).FontColor(Colors.Grey.Darken1);
                });
            });

            column.Item().PaddingTop(10).LineHorizontal(1).LineColor(Colors.Grey.Lighten1);
        });
    }

    private void ComposeContent(IContainer container)
    {
        container.PaddingVertical(15).Column(column =>
        {
            column.Spacing(14);

            // 3. Movement details
            column.Item().Element(ComposeMovementDetails);

            // 4. Asset/material details
            column.Item().Element(ComposeItemsTable);

            // 5. Transporter
            column.Item().Element(ComposeTransporterSection);

            // 6. Approval history
            column.Item().Element(ComposeApprovalHistoryTable);

            // 7. QR verification
            column.Item().Element(ComposeQrVerificationPlaceholder);

            // 8. Security gate verification
            column.Item().Element(ComposeSecurityGateVerification);

            // 9. Return tracking
            column.Item().Element(ComposeReturnTracking);
        });
    }

    private void ComposeMovementDetails(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Movement Details").FontSize(11).Bold();

            column.Item().PaddingTop(4).Row(row =>
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

            column.Item().PaddingTop(10).Element(ComposeFromToSummary);

            if (!string.IsNullOrWhiteSpace(_movement.Purpose))
            {
                column.Item().PaddingTop(10).Column(c =>
                {
                    c.Item().Text("Purpose").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.Purpose);
                });
            }
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

    // 5. Transporter - always rendered now (previously conditional on
    // TransporterId/VehicleNumber being set), so the printed pass always
    // has a consistent, predictable set of sections.
    private void ComposeTransporterSection(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Transporter").FontSize(11).Bold();

            column.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Transporter Name").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_dispatch.Transporter?.Name ?? "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Vehicle Number").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_dispatch.VehicleNumber ?? "-").Bold();
                });
            });
        });
    }

    private void ComposeItemsTable(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Asset / Material Details").FontSize(11).Bold();

            column.Item().PaddingTop(4).Table(table =>
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

            column.Item().PaddingTop(4).Table(table =>
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

    // 7. QR verification - see this class's top comment for why there's
    // no real QR image yet. This reserves the visual slot and keeps the
    // Gate Pass Number as the manual verification handle in the
    // meantime, so swapping in a real QR image later is a layout-only
    // change (replace the placeholder box's content with an Image call).
    private void ComposeQrVerificationPlaceholder(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("QR Verification").FontSize(11).Bold();

            column.Item().PaddingTop(4).Background(Colors.Grey.Lighten4).Padding(10).Row(row =>
            {
                row.ConstantItem(64).Column(c =>
                {
                    c.Item().AlignCenter().Text("QR").FontSize(11).Bold()
                        .FontColor(Colors.Grey.Darken2);
                    c.Item().AlignCenter().Text("Reserved").FontSize(7)
                        .FontColor(Colors.Grey.Darken1);
                });

                row.RelativeItem().PaddingLeft(12).Column(c =>
                {
                    c.Item().Text(
                        "A scannable QR code is reserved for a future update. Until " +
                        "then, verify this pass manually using the Gate Pass Number below.")
                        .FontSize(9).FontColor(Colors.Grey.Darken2);

                    c.Item().PaddingTop(6)
                        .Text(_dispatch.GatePassNumber ?? $"Movement #{_movement.Id}")
                        .FontSize(13).Bold();
                });
            });
        });
    }

    // 8. Security gate verification - pure print layout (blank sign-off
    // lines), no new digital workflow step or database field. Filled in
    // by hand by the security guard at the physical gate.
    private void ComposeSecurityGateVerification(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Security Gate Verification").FontSize(11).Bold();

            column.Item().PaddingTop(4)
                .Text("To be completed by security personnel at the gate.")
                .FontSize(8).FontColor(Colors.Grey.Darken1);

            column.Item().PaddingTop(12).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Security Guard Name").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(16).LineHorizontal(0.75f).LineColor(Colors.Grey.Darken1);
                });

                row.ConstantItem(20);

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Signature").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(16).LineHorizontal(0.75f).LineColor(Colors.Grey.Darken1);
                });

                row.ConstantItem(20);

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Date & Time").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().PaddingTop(16).LineHorizontal(0.75f).LineColor(Colors.Grey.Darken1);
                });
            });
        });
    }

    // 9. Return tracking - read-only. Only MovementType ==
    // "TemporaryMovement" ever has real data here; every other type
    // prints "Not applicable" since a return never applies to it. Even
    // for a TemporaryMovement, _returnRecord is null until a later phase
    // builds the actual "mark returned" action - this section is ready
    // to show real data the moment that exists, without another PDF
    // change.
    private void ComposeReturnTracking(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().Text("Return Tracking").FontSize(11).Bold();

            if (_movement.MovementType != "TemporaryMovement")
            {
                column.Item().PaddingTop(4)
                    .Text("Not applicable - this movement type does not require a return.")
                    .FontSize(9).FontColor(Colors.Grey.Darken1);

                return;
            }

            column.Item().PaddingTop(4).Row(row =>
            {
                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Expected Return Date").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_movement.ExpectedReturnDate.HasValue
                        ? _movement.ExpectedReturnDate.Value.ToString("d MMM yyyy")
                        : "-").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Status").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_returnRecord?.Status ?? "Not Yet Returned").Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    var actualReturnText = _returnRecord != null && _returnRecord.ActualReturnDate.HasValue
                        ? _returnRecord.ActualReturnDate.Value.ToString("d MMM yyyy")
                        : "-";

                    c.Item().Text("Actual Return Date").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(actualReturnText).Bold();
                });

                row.RelativeItem().Column(c =>
                {
                    c.Item().Text("Returned By").FontSize(9).FontColor(Colors.Grey.Darken1);
                    c.Item().Text(_returnRecord?.ReturnedByUser?.FullName ?? "-").Bold();
                });
            });
        });
    }

    // 10. Controlled-document footer.
    private void ComposeFooter(IContainer container)
    {
        container.Column(column =>
        {
            column.Item().PaddingBottom(4).LineHorizontal(0.5f).LineColor(Colors.Grey.Lighten2);

            column.Item().Row(row =>
            {
                row.RelativeItem().Text(
                    "This is a system-generated controlled document. Unauthorized " +
                    "reproduction, alteration, or use outside its intended purpose is " +
                    "prohibited.")
                    .FontSize(7).FontColor(Colors.Grey.Darken1);

                row.ConstantItem(140).AlignRight().Text(text =>
                {
                    text.Span("Page ");
                    text.CurrentPageNumber();
                    text.Span(" of ");
                    text.TotalPages();
                });
            });

            column.Item().PaddingTop(2)
                .Text(
                    $"Gate Pass: {_dispatch.GatePassNumber ?? $"Movement #{_movement.Id}"}   |   " +
                    $"Generated: {DateTime.UtcNow:d MMM yyyy HH:mm} UTC")
                .FontSize(7).FontColor(Colors.Grey.Darken1);
        });
    }
}
